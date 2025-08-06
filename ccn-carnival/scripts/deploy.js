async function main() {
  const Carnival = await ethers.getContractFactory("CCNCarnival");
  const carnival = await Carnival.deploy();
  await carnival.deployed();
  console.log(`CCNCarnival deployed to: ${carnival.address}`);
}

main().catch((error) => {
  console.error(error);
  console.log("cool")
  process.exitCode = 1;
});
