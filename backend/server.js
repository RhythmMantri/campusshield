const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Tesseract = require('tesseract.js');
const {Web3}= require('web3');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Load sample data
let sampleData = [];
try {
  sampleData = JSON.parse(fs.readFileSync('./sample_data.json', 'utf8'));
} catch (error) {
  console.log('Sample data not found, using empty array');
}

// Smart Contract Configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678'; // Replace with deployed address
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "certId", "type": "string"},
      {"internalType": "string", "name": "hash", "type": "string"}
    ],
    "name": "registerCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "certId", "type": "string"},
      {"internalType": "string", "name": "hash", "type": "string"}
    ],
    "name": "verifyCertificate",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "", "type": "string"}],
    "name": "certificates",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Web3 setup
const web3 = new Web3(process.env.ETHEREUM_RPC || 'https://rpc-mumbai.maticvigil.com/');
const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);

// Helper Functions
function generateHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function performOCR(filePath) {
  try {
    console.log('Starting OCR for:', filePath);
    const result = await Tesseract.recognize(filePath, 'eng', {
      logger: m => console.log(m)
    });
    
    const text = result.data.text;
    console.log('OCR Result:', text);
    
    // Extract fields using regex patterns
    const patterns = {
      cert_id: /(?:certificate\s+(?:id|no|number)[\s:]*|cert[\s:]*|id[\s:]*|number[\s:]*)([A-Z0-9-]+)/i,
      name: /(?:name[\s:]*|student[\s:]*)([\w\s]+)(?:\n|roll)/i,
      roll_no: /(?:roll[\s]+(?:no|number)[\s:]*|roll[\s:]*|student[\s]+(?:id|no)[\s:]*)([\w0-9]+)/i,
      year: /(20\d{2})/
    };
    
    const extracted = {};
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        extracted[key] = match[1].trim();
      }
    }
    
    console.log('Extracted data:', extracted);
    return extracted;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

function verifyAgainstDB(extractedData) {
  const matchingRecord = sampleData.find(record => 
    record.cert_id === extractedData.cert_id
  );
  
  if (!matchingRecord) {
    return { 
      status: 'invalid', 
      reason: 'Certificate ID not found in database',
      confidence: 0
    };
  }
  
  let matches = 0;
  let total = 0;
  
  for (const key of ['name', 'roll_no', 'year']) {
    if (matchingRecord[key] && extractedData[key]) {
      total++;
      if (matchingRecord[key].toLowerCase().includes(extractedData[key].toLowerCase()) ||
          extractedData[key].toLowerCase().includes(matchingRecord[key].toLowerCase())) {
        matches++;
      }
    }
  }
  
  const confidence = total > 0 ? (matches / total) * 100 : 0;
  
  if (confidence >= 80) {
    return { status: 'valid', reason: 'All fields match', confidence, record: matchingRecord };
  } else if (confidence >= 50) {
    return { status: 'suspicious', reason: 'Some fields do not match', confidence, record: matchingRecord };
  } else {
    return { status: 'invalid', reason: 'Field mismatch', confidence, record: matchingRecord };
  }
}

async function verifyOnBlockchain(certId, hash) {
  try {
    const isVerified = await contract.methods.verifyCertificate(certId, hash).call();
    return { verified: isVerified, error: null };
  } catch (error) {
    console.error('Blockchain verification error:', error);
    return { verified: false, error: error.message };
  }
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Certificate Validator' });
});

app.post('/verify', upload.single('certificate'), async (req, res) => {
  try {
    if (!req.file) {
      return res.render('result', { 
        success: false, 
        error: 'No file uploaded',
        title: 'Verification Result'
      });
    }
    
    const filePath = req.file.path;
    const fileHash = generateHash(filePath);
    
    console.log('Processing file:', filePath);
    console.log('File hash:', fileHash);
    
    // Step 1: OCR
    const extractedData = await performOCR(filePath);
    
    if (!extractedData.cert_id) {
      return res.render('result', {
        success: false,
        error: 'Could not extract certificate ID from the document',
        title: 'Verification Result'
      });
    }
    
    // Step 2: Database verification
    const dbResult = verifyAgainstDB(extractedData);
    
    // Step 3: Blockchain verification
    const blockchainResult = await verifyOnBlockchain(extractedData.cert_id, fileHash);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    // Determine final status
    let finalStatus = dbResult.status;
    let statusColor = 'red';
    let statusIcon = '❌';
    
    if (dbResult.status === 'valid' && blockchainResult.verified) {
      statusColor = 'green';
      statusIcon = '✅';
    } else if (dbResult.status === 'valid' && !blockchainResult.verified) {
      finalStatus = 'valid_no_blockchain';
      statusColor = 'orange';
      statusIcon = '⚠️';
    } else if (dbResult.status === 'suspicious') {
      statusColor = 'yellow';
      statusIcon = '⚠️';
    }
    
    res.render('result', {
      success: true,
      status: finalStatus,
      statusColor,
      statusIcon,
      extractedData,
      dbResult,
      blockchainResult,
      fileHash,
      title: 'Verification Result'
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.render('result', {
      success: false,
      error: error.message,
      title: 'Verification Result'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Certificate Validator running on http://localhost:${PORT}`);
  console.log(`📊 Sample data loaded: ${sampleData.length} records`);
});

module.exports = app;