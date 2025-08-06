const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = require("ethers");

describe("CCNCarnival", function () {
  let carnival, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Carnival = await ethers.getContractFactory("CCNCarnival");
    carnival = await Carnival.deploy();
  });

  // 1. Register Stall (Negative Test Cases)
  it("Should fail if duration is less than 1", async function () {
    await expect(carnival.registerStall("Food", 0))
      .to.be.revertedWith("Invalid duration");
  });

  it("Should fail if duration is greater than 3", async function () {
    await expect(carnival.registerStall("Food", 4))
      .to.be.revertedWith("Invalid duration");
  });

  // 2. Register Stall (Positive Test Case)
  it("Should register stall successfully", async function () {
    await carnival.registerStall("Food", 3);
    expect(await carnival.stallCount()).to.equal(1);
  });

  // 3. Pay (Negative Test Cases)
  it("Should fail if stall is not registered", async function () {
    await expect(carnival.connect(user).payToStall(1, { value: parseEther("1") }))
      .to.be.revertedWith("Stall not registered");
  });

  it("Should fail if no ETH is sent", async function () {
    await carnival.registerStall("Food", 3);
    await expect(carnival.connect(user).payToStall(1, { value: 0 }))
      .to.be.revertedWith("Must send ETH");
  });

  // 4. Pay (Positive Test Case)
  it("Should accept payments", async function () {
    await carnival.registerStall("Food", 3);
    await carnival.connect(user).payToStall(1, { value: parseEther("1") });
    const paid = await carnival.payments(1, user.address);
    expect(paid).to.equal(parseEther("1"));
  });

  // 5. Refund (Negative Test Cases)
  it("Should fail if non-owner tries to refund", async function () {
    await carnival.registerStall("Food", 3);
    await carnival.connect(user).payToStall(1, { value: parseEther("1") });
    await expect(carnival.connect(user).refundUser(1, user.address, parseEther("0.5")))
      .to.be.revertedWith("Not stall owner");
  });

  it("Should fail if refund exceeds payment", async function () {
    await carnival.registerStall("Food", 3);
    await carnival.connect(user).payToStall(1, { value: parseEther("1") });
    await expect(carnival.refundUser(1, user.address, parseEther("2")))
      .to.be.revertedWith("Refund exceeds payment");
  });

  // 6. Refund (Positive Test Case)
  it("Should allow refunds by owner", async function () {
    await carnival.registerStall("Food", 3);
    await carnival.connect(user).payToStall(1, { value: parseEther("1") });
    await carnival.refundUser(1, user.address, parseEther("0.5"));
    const paid = await carnival.payments(1, user.address);
    expect(paid).to.equal(parseEther("0.5"));
  });

  // 7. Withdraw (Negative Test Cases)
  it("Should fail if non-owner tries to withdraw", async function () {
    await carnival.registerStall("Food", 1);
    await carnival.connect(user).payToStall(1, { value: parseEther("1") });
    await expect(carnival.connect(user).withdraw(1, 3))
      .to.be.revertedWith("Not stall owner");
  });

  it("Should fail if withdrawing before event ends", async function () {
    await carnival.registerStall("Food", 3);
    await carnival.connect(user).payToStall(1, { value: parseEther("1") });
    await expect(carnival.withdraw(1, 1))
      .to.be.revertedWith("Stall still active");
  });

  it("Should fail if withdrawing twice", async function () {
    await carnival.registerStall("Food", 1);
    await carnival.connect(user).payToStall(1, { value: parseEther("1") });
    await carnival.withdraw(1, 3);
    await expect(carnival.withdraw(1, 3))
      .to.be.revertedWith("Funds already withdrawn");
  });

  // 8. Withdraw (Positive Test Case)
  it("Should allow withdrawals after event ends", async function () {
    await carnival.registerStall("Food", 1);
    await carnival.connect(user).payToStall(1, { value: parseEther("1") });
    await carnival.withdraw(1, 3);
    const stall = await carnival.stalls(1);
    expect(stall.withdrawn).to.be.true;
  });

  // 9. Additional Feature Example: Event Emission
  it("Should emit PaymentMade event on payment", async function () {
    await carnival.registerStall("Food", 3);
    await expect(carnival.connect(user).payToStall(1, { value: parseEther("1") }))
      .to.emit(carnival, "PaymentMade")
      .withArgs(1, user.address, parseEther("1"));
  });
});
