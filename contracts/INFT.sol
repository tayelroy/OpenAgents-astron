// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract INFT is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    uint256 public mintFee;

    struct AgentBrain {
        string cid;
        string ens;
    }

    mapping(uint256 => AgentBrain) private _brains;

    event BrainLinked(uint256 indexed tokenId, string cid, string ens);

    constructor(address initialOwner, uint256 initialMintFee) ERC721('Astron iNFT', 'ASTRINFT') Ownable(initialOwner) {
        mintFee = initialMintFee;
    }

    function mintAgent(address to, string calldata cid) external payable returns (uint256) {
        require(msg.value >= mintFee, 'Insufficient mint fee');
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _brains[tokenId] = AgentBrain({cid: cid, ens: ''});
        emit BrainLinked(tokenId, cid, '');
        return tokenId;
    }

    function setMintFee(uint256 newMintFee) external onlyOwner {
        mintFee = newMintFee;
    }

    function linkENS(uint256 tokenId, string calldata ens) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), 'Token does not exist');
        _brains[tokenId].ens = ens;
        emit BrainLinked(tokenId, _brains[tokenId].cid, ens);
    }

    function getBrain(uint256 tokenId) external view returns (AgentBrain memory) {
        require(_ownerOf(tokenId) != address(0), 'Token does not exist');
        return _brains[tokenId];
    }
}