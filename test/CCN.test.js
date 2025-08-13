const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = require("ethers");

describe("CCNCarnival", function () {
  let carnival, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const Carnival = await ethers.getContractFactory("CCNCarnival");
    carnival = await Carnival.deploy();
  });


  it("Should register a stall1", async function () {
    await carnival.registerStall("Food Stall", 3);
    await expect(carnival.registerStall("Bad", 0))
    .to.be.revertedWith("Invalid duration");
    await expect(carnival.registerStall("Bad", 4))
    .to.be.revertedWith("Invalid duration");
    expect(await carnival.stallCount()).to.equal(1);
  });

  it("Should accept payments", async function () {
    await carnival.registerStall("Food Stall", 3);
    await carnival.connect(user1).payToStall(1, { value: ethers.parseEther("1") });
    const paid = await carnival.payments(1, user1.address);
    expect(paid).to.equal(ethers.parseEther("1"));
  });

  it("Should allow refunds by owner", async function () {
    await carnival.registerStall("Food Stall", 3);
    await carnival.connect(user1).payToStall(1, { value: parseEther("1") });

    await expect(
      carnival.refundUser(1, user1.address, parseEther("0.5"))
    ).to.emit(carnival, "RefundIssued").withArgs(1, user1.address, parseEther("0.5"));

    const paid = await carnival.payments(1, user1.address);
    expect(paid).to.equal(parseEther("0.5"));

    const s = await carnival.stalls(1);
    expect(s.totalCollected).to.equal(parseEther("0.5"));
    if (s.netRevenue !== undefined) {
      expect(s.netRevenue).to.equal(parseEther("0.5"));
    }
  });

  it("Should allo1 withdrawals after event ends", async function () {
    await carnival.registerStall("Food Stall", 1);
    await carnival.connect(user1).payToStall(1, { value: parseEther("1") });

    await expect(
      carnival.withdraw(1, 3) 
    ).to.emit(carnival, "WithdrawalMade").withArgs(1, (await ethers.getSigners())[0].address, parseEther("1"));

    const stall = await carnival.stalls(1);
    expect(stall.withdrawn).to.be.true;
    expect(stall.totalCollected).to.equal(0n); 
  });


  it("Owner can set max stalls", async function () {
    await carnival.setMaxStalls(5);
    expect(await carnival.maxStalls()).to.equal(5);
  });

  it("setMaxStalls reverts if below current count", async function () {
    await carnival.registerStall("S1", 1);
    await carnival.registerStall("S2", 1);
    await expect(carnival.setMaxStalls(1))
      .to.be.revertedWith("Below current count");
  });


  it("registerStall reverts when cap reached", async function () {
    await carnival.setMaxStalls(1);
    await carnival.registerStall("S1", 1);
    await expect(carnival.registerStall("S2", 1)).to.be.revertedWith("Max stalls reached");
  });

  it("getTopStalls handles k > stallCount", async function () {
    await carnival.registerStall("A", 1);
    const [ids, revs] = await carnival.getTopStalls(5);
    expect(ids.length).to.equal(1);
    expect(revs.length).to.equal(1);
  });

  it("getTopStalls ranks stalls correctly after payments and refunds", async function () {
    await carnival.registerStall("A", 1);
    await carnival.registerStall("B", 1);
    await carnival.registerStall("C", 1);

    await carnival.connect(user1).payToStall(1, { value: ethers.parseEther("1") });
    await carnival.connect(user1).payToStall(2, { value: ethers.parseEther("1") });
    await carnival.refundUser(2, user1.address, ethers.parseEther("0.2"));
    await carnival.connect(user1).payToStall(3, { value: ethers.parseEther("0.5") });

    const [ids, revs] = await carnival.getTopStalls(3);
    expect(ids[0]).to.equal(1n);
    expect(revs[0]).to.equal(ethers.parseEther("1"));
    expect(ids[1]).to.equal(2n);
    expect(revs[1]).to.equal(ethers.parseEther("0.8"));
    expect(ids[2]).to.equal(3n);
    expect(revs[2]).to.equal(ethers.parseEther("0.5"));
  });

  it("getTopStalls stops when no revenue-bearing stalls remain", async function () {
    await carnival.registerStall("A", 1);
    await carnival.registerStall("B", 1);
    const [ids, revs] = await carnival.getTopStalls(2);
    expect(ids.length).to.equal(2);
    expect(revs.length).to.equal(2);
  });

  it("Aggregates multiple payments correctly", async function () {
    await carnival.registerStall("Mix", 2);
    await carnival.connect(user1).payToStall(1, { value: ethers.parseEther("0.3") });
    await carnival.connect(user2).payToStall(1, { value: ethers.parseEther("0.2") });
    await carnival.connect(user1).payToStall(1, { value: ethers.parseEther("0.5") });

    expect(await carnival.payments(1, user1.address)).to.equal(ethers.parseEther("0.8"));
    expect(await carnival.payments(1, user2.address)).to.equal(ethers.parseEther("0.2"));

    const s = await carnival.stalls(1);
    expect(s.totalCollected).to.equal(ethers.parseEther("1.0"));
  });

  it("Withdraw works with zero amount if allowed", async function () {
    await carnival.registerStall("Empty", 1);
    await carnival.withdraw(1, 3);
    const s = await carnival.stalls(1);
    expect(s.withdrawn).to.be.true;
  });

  it("Emits all events", async function () {
    await expect(carnival.registerStall("E", 2))
      .to.emit(carnival, "StallRegistered");

    await expect(carnival.connect(user1).payToStall(1, { value: ethers.parseEther("0.1") }))
      .to.emit(carnival, "PaymentMade");

    await expect(carnival.refundUser(1, user1.address, ethers.parseEther("0.05")))
      .to.emit(carnival, "RefundIssued");

    await expect(carnival.withdraw(1, 3))
      .to.emit(carnival, "WithdrawalMade");
  });

  it("Reverts if ETH sent directly to contract", async function () {
    const tx = { to: await carnival.getAddress(), value: ethers.parseEther("1") };
    await expect(user1.sendTransaction(tx)).to.be.revertedWith("Please use payToStall");
  });
});
