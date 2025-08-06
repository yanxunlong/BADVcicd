const hre = require("hardhat");

async function main() {
  const Carnival = await hre.ethers.getContractFactory("CCNCarnival");
  const carnival = await Carnival.deploy();

  await carnival.waitForDeployment();

  console.log("CCNCarnival deployed to:", await carnival.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });