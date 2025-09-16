const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Certificate Registry deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Deployment Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  console.log("- Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Deploy the contract
  console.log("\n📦 Deploying CertificateRegistry contract...");
  
  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const certificateRegistry = await CertificateRegistry.deploy();
  
  await certificateRegistry.waitForDeployment();
  const contractAddress = await certificateRegistry.getAddress();
  
  console.log("✅ CertificateRegistry deployed to:", contractAddress);
  
  // Get transaction hash
  const deploymentTx = certificateRegistry.deploymentTransaction();
  console.log("📄 Transaction hash:", deploymentTx.hash);
  
  // Wait for a few confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await deploymentTx.wait(2);
  console.log("✅ Contract confirmed on blockchain");
  
  // Test the contract
  console.log("\n🧪 Testing contract functionality...");
  
  try {
    // Test 1: Register a certificate
    const testCertId = "TEST-2024-001";
    const testHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    
    console.log("- Registering test certificate...");
    const registerTx = await certificateRegistry.registerCertificate(testCertId, testHash);
    await registerTx.wait();
    console.log("  ✅ Certificate registered");
    
    // Test 2: Verify the certificate
    console.log("- Verifying test certificate...");
    const isVerified = await certificateRegistry.verifyCertificate(testCertId, testHash);
    console.log("  ✅ Certificate verified:", isVerified);
    
    // Test 3: Get certificate hash
    const storedHash = await certificateRegistry.getCertificateHash(testCertId);
    console.log("  ✅ Retrieved hash:", storedHash);
    
    // Test 4: Check total certificates
    const totalCerts = await certificateRegistry.getTotalCertificates();
    console.log("  ✅ Total certificates:", totalCerts.toString());
    
  } catch (error) {
    console.log("❌ Contract testing failed:", error.message);
  }
  
  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    transactionHash: deploymentTx.hash,
    blockNumber: deploymentTx.blockNumber,
    deployedAt: new Date().toISOString(),
    contractName: "CertificateRegistry",
    abi: [
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
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "", "type": "string"}],
        "name": "certificates",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "certId", "type": "string"}],
        "name": "getCertificateHash",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "certId", "type": "string"}],
        "name": "certificateExists",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getTotalCertificates",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ]
  };
  
  // Save to deployment file
  const deploymentPath = path.join(__dirname, `deployment-${network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);
  
  // Create .env template
  const envTemplate = `
# Blockchain Configuration
CONTRACT_ADDRESS=${contractAddress}
ETHEREUM_RPC=${getDefaultRPC(network.chainId)}
NETWORK_NAME=${network.name}
CHAIN_ID=${network.chainId}

# Add your private key for transactions (optional)
# PRIVATE_KEY=your_private_key_here

# Other environment variables
PORT=3000
NODE_ENV=development
  `.trim();
  
  const envPath = path.join(__dirname, '../.env.example');
  fs.writeFileSync(envPath, envTemplate);
  console.log(`📝 Environment template saved to: ${envPath}`);
  
  // Pre-populate with sample certificates
  if (network.name === 'hardhat' || network.name === 'mumbai') {
    console.log("\n📚 Pre-populating with sample certificates...");
    
    const sampleData = JSON.parse(fs.readFileSync(path.join(__dirname, '../sample_data.json'), 'utf8'));
    
    for (let i = 0; i < Math.min(3, sampleData.length); i++) {
      const cert = sampleData[i];
      const sampleHash = ethers.keccak256(ethers.toUtf8Bytes(`${cert.cert_id}-${cert.name}-${cert.roll_no}`));
      
      try {
        console.log(`- Registering ${cert.cert_id}...`);
        const tx = await certificateRegistry.registerCertificate(cert.cert_id, sampleHash);
        await tx.wait();
        console.log(`  ✅ ${cert.name} - ${cert.cert_id}`);
      } catch (error) {
        console.log(`  ❌ Failed to register ${cert.cert_id}:`, error.message);
      }
    }
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log(`\n📋 Summary:`);
  console.log(`- Contract Address: ${contractAddress}`);
  console.log(`- Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`- Explorer: ${getExplorerUrl(network.chainId, contractAddress)}`);
  
  console.log(`\n🔧 Next Steps:`);
  console.log(`1. Update your .env file with CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`2. Start your Node.js server: npm start`);
  console.log(`3. Visit http://localhost:3000 to test the application`);
}

function getDefaultRPC(chainId) {
  const rpcs = {
    1: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
    5: 'https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID',
    11155111: 'https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID',
    80001: 'https://rpc-mumbai.maticvigil.com/',
    31337: 'http://127.0.0.1:8545'
  };
  return rpcs[chainId] || 'http://127.0.0.1:8545';
}

function getExplorerUrl(chainId, address) {
  const explorers = {
    1: `https://etherscan.io/address/${address}`,
    5: `https://goerli.etherscan.io/address/${address}`,
    11155111: `https://sepolia.etherscan.io/address/${address}`,
    80001: `https://mumbai.polygonscan.com/address/${address}`,
    31337: 'Local network - no explorer'
  };
  return explorers[chainId] || 'Unknown network';
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });