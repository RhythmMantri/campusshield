// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CertificateRegistry {
    // Mapping to store certificate hashes by certificate ID
    mapping(string => string) public certificates;
    
    // Mapping to track who registered each certificate
    mapping(string => address) public registeredBy;
    
    // Array to keep track of all certificate IDs
    string[] public allCertificateIds;
    
    // Events
    event CertificateRegistered(
        string indexed certId, 
        string hash, 
        address indexed registeredBy,
        uint256 timestamp
    );
    
    event CertificateVerified(
        string indexed certId, 
        bool isValid, 
        address indexed verifiedBy,
        uint256 timestamp
    );
    
    // Owner of the contract (for administrative purposes)
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a new certificate hash
     * @param certId The certificate ID
     * @param hash The SHA256 hash of the certificate file
     */
    function registerCertificate(string memory certId, string memory hash) public {
        require(bytes(certId).length > 0, "Certificate ID cannot be empty");
        require(bytes(hash).length > 0, "Hash cannot be empty");
        
        // Check if certificate already exists
        if (bytes(certificates[certId]).length == 0) {
            allCertificateIds.push(certId);
        }
        
        certificates[certId] = hash;
        registeredBy[certId] = msg.sender;
        
        emit CertificateRegistered(certId, hash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Verify a certificate against stored hash
     * @param certId The certificate ID to verify
     * @param hash The hash to verify against
     * @return bool True if the certificate is valid
     */
    function verifyCertificate(string memory certId, string memory hash) 
        public 
        returns (bool) 
    {
        require(bytes(certId).length > 0, "Certificate ID cannot be empty");
        require(bytes(hash).length > 0, "Hash cannot be empty");
        
        bool isValid = keccak256(bytes(certificates[certId])) == keccak256(bytes(hash));
        
        emit CertificateVerified(certId, isValid, msg.sender, block.timestamp);
        
        return isValid;
    }
    
    /**
     * @dev Check if a certificate exists in the registry
     * @param certId The certificate ID to check
     * @return bool True if the certificate exists
     */
    function certificateExists(string memory certId) public view returns (bool) {
        return bytes(certificates[certId]).length > 0;
    }
    
    /**
     * @dev Get certificate hash by ID
     * @param certId The certificate ID
     * @return string The stored hash
     */
    function getCertificateHash(string memory certId) public view returns (string memory) {
        return certificates[certId];
    }
    
    /**
     * @dev Get who registered a certificate
     * @param certId The certificate ID
     * @return address The address that registered the certificate
     */
    function getRegisteredBy(string memory certId) public view returns (address) {
        return registeredBy[certId];
    }
    
    /**
     * @dev Get total number of registered certificates
     * @return uint256 Total count
     */
    function getTotalCertificates() public view returns (uint256) {
        return allCertificateIds.length;
    }
    
    /**
     * @dev Get certificate ID by index (for enumeration)
     * @param index The index in the array
     * @return string The certificate ID
     */
    function getCertificateIdByIndex(uint256 index) public view returns (string memory) {
        require(index < allCertificateIds.length, "Index out of bounds");
        return allCertificateIds[index];
    }
    
    /**
     * @dev Batch register multiple certificates (admin only)
     * @param certIds Array of certificate IDs
     * @param hashes Array of corresponding hashes
     */
    function batchRegister(
        string[] memory certIds, 
        string[] memory hashes
    ) public onlyOwner {
        require(certIds.length == hashes.length, "Arrays length mismatch");
        
        for (uint i = 0; i < certIds.length; i++) {
            registerCertificate(certIds[i], hashes[i]);
        }
    }
    
    /**
     * @dev Emergency function to update owner
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}