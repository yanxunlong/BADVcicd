const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CCNCarnival", function () {
  let carnival, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Carnival = await ethers.getContractFactory("CCNCarnival");
    carnival = await Carnival.deploy();
  });

  it("Should register a stall", async function () {
    await carnival.registerStall("Food Stall", 3);
    expect(await carnival.stallCount()).to.equal(1);
  });

  it("Should accept payments", async function () {
    await carnival.registerStall("Food Stall", 3);
    await carnival.connect(user).payToStall(1, { value: ethers.utils.parseEther("1") });
    const paid = await carnival.payments(1, user.address);
    expect(paid).to.equal(ethers.utils.parseEther("1"));
  });

  it("Should allow refunds by owner", async function () {
    await carnival.registerStall("Food Stall", 3);
    await carnival.connect(user).payToStall(1, { value: ethers.utils.parseEther("1") });
    await carnival.refundUser(1, user.address, ethers.utils.parseEther("0.5"));
    const paid = await carnival.payments(1, user.address);
    expect(paid).to.equal(ethers.utils.parseEther("0.5"));
  });

  it("Should allow withdrawals after event ends", async function () {
    await carnival.registerStall("Food Stall", 1);
    await carnival.connect(user).payToStall(1, { value: ethers.utils.parseEther("1") });
    await carnival.withdraw(1, 3);
    const stall = await carnival.stalls(1);
    expect(stall.withdrawn).to.be.true;
  });
});
