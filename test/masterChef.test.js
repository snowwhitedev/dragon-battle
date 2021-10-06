const { expect, assert } = require("chai");
// const { providers } = require("ethers");
const { ethers } = require("hardhat");
const {
  DGNG_PRE_MINT,
  getBigNumber,
  advanceBlock,
} = require("../scripts/shared");

const DGNG_PER_BLOCK = getBigNumber(5, 16); // 0.05 dgng per block
const DGNG_REWARD_PERIOD = 15; // reward every 15 seconds

describe("MasterChef", function () {
  before(async function () {
    this.MasterChef = await ethers.getContractFactory("MasterChef");
    this.DragonUtility = await ethers.getContractFactory("DragonUtility");
    this.MockDGNG = await ethers.getContractFactory("MockDGNG");
    this.MockERC20 = await ethers.getContractFactory("MockERC20");
    this.signers = await ethers.getSigners();
    this.alice = this.signers[0];
    this.bob = this.signers[1];
    this.devWallet = this.signers[2];
    this.dev = this.signers[0];
  });

  beforeEach(async function () {
    this.dgng = await this.MockDGNG.deploy(this.dev.address);
    this.usdc = await this.MockERC20.deploy(
      "Mock USDC",
      "MockUSDC",
      getBigNumber(10000000000)
    );
    this.weth = await this.MockERC20.deploy(
      "Mock WETH",
      "MockWETH",
      getBigNumber(100000000)
    );
    this.link = await this.MockERC20.deploy(
      "Mock Link",
      "MockLink",
      getBigNumber(100000000)
    );
    this.dragonUtility = await this.DragonUtility.deploy(
      this.devWallet.address,
      this.usdc.address
    );

    this.masterChef = await this.MasterChef.deploy(
      this.dgng.address,
      this.dragonUtility.address,
      this.bob.address,
      0,
      DGNG_PER_BLOCK, // 0.05 DGNG
      this.devWallet.address
    );

    this.dgng.transferOwnership(this.masterChef.address);
  });

  describe("PoolLength", function () {
    it("PoolLength should be increased", async function () {
      await this.masterChef.add(50 * 100, this.dgng.address, 0, false);
      expect(await this.masterChef.poolLength()).to.be.equal(1);
    });

    it("Each Pool can not be added twice", async function () {
      await this.masterChef.add(50 * 100, this.dgng.address, 0, false);
      expect(await this.masterChef.poolLength()).to.be.equal(1);

      await expect(
        this.masterChef.add(50 * 100, this.dgng.address, 0, false)
      ).to.be.revertedWith("nonDuplicated: duplicated");
    });
  });

  describe("Set", function () {
    it("Should emit SetPool", async function () {
      await this.masterChef.add(50 * 100, this.dgng.address, 0, false);
      await expect(this.masterChef.set(0, 60 * 100, 100, false))
        .to.emit(this.masterChef, "SetPool")
        .withArgs(0, this.dgng.address, 60 * 100, 100);
    });

    it("Should revert if invalid pool", async function () {
      await expect(
        this.masterChef.set(2, 60 * 100, 100, false)
      ).to.be.revertedWith("Transaction reverted without a reason string");
    });
  });

  describe("Pending DGNG", function () {
    it("PendingDGNG should equal ExpectedDGNG", async function () {
      await this.masterChef.add(5000, this.dgng.address, 0, false);
      await this.dgng.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      const log1 = await (
        await this.masterChef.deposit(0, getBigNumber(1))
      ).wait();

      await advanceBlock();
      const currentDate = new Date();
      const afterThreeHours = new Date(
        currentDate.setDate(currentDate.getHours() + 3) //After 3 hours
      );
      const afterThreeHoursTimeStampUTC =
        new Date(afterThreeHours.toUTCString()).getTime() / 1000;
      network.provider.send("evm_setNextBlockTimestamp", [
        afterThreeHoursTimeStampUTC,
      ]);
      await network.provider.send("evm_mine");
      const log2 = await this.masterChef.updatePool(0);
      await advanceBlock();

      const block1 = await ethers.provider.getBlock(log1.blockNumber);
      const block2 = await ethers.provider.getBlock(log2.blockNumber);

      const expectedDGNG = DGNG_PER_BLOCK.mul(
        ~~((block2.timestamp - block1.timestamp) / DGNG_REWARD_PERIOD)
      )
        .mul(975)
        .div(1000);

      const pendingDGNG = await this.masterChef.pendingDgng(
        0,
        this.signers[0].address
      );

      expect(expectedDGNG).to.be.equal(pendingDGNG);
    });
  });

  describe("Deposit", function () {
    beforeEach(async function () {
      await this.masterChef.add(5000, this.dgng.address, 0, false);
      await this.dgng.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
    });

    it("Should not allow to deposit 0 amount", async function () {
      await expect(this.masterChef.deposit(0, 0)).to.be.revertedWith(
        "Dragon: ZERO_VALUE"
      );
    });

    it("Should not allow to deposit in non-existent pool", async function () {
      await expect(
        this.masterChef.deposit(1001, getBigNumber(1))
      ).to.be.revertedWith("Dragon: Non-existent pool");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {});

    it("Withdraw 0 amount", async function () {
      await this.masterChef.add(5000, this.dgng.address, 0, false);
      await this.dgng.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      const depositLog = await this.masterChef.deposit(0, getBigNumber(1000));

      await advanceBlock();
      const dgngBalanceBefore = await this.dgng.balanceOf(
        this.signers[0].address
      );
      await advanceBlock();
      const withdrawLog = await this.masterChef.withdraw(0, 0);

      const block1 = await ethers.provider.getBlock(withdrawLog.blockNumber);
      const block2 = await ethers.provider.getBlock(depositLog.blockNumber);

      const expectedDGNG = DGNG_PER_BLOCK.mul(
        ~~((block2.timestamp - block1.timestamp) / DGNG_REWARD_PERIOD)
      )
        .mul(975)
        .div(1000);

      const dgngBalanceAfter = await this.dgng.balanceOf(
        this.signers[0].address
      );

      expect(expectedDGNG.add(dgngBalanceBefore)).to.be.equal(dgngBalanceAfter);
    });

    // TODO should revert invalid pool
  });

  describe("EmergencyWithdraw", function () {
    beforeEach(async function () {});

    it("EmergencyWithdraw 0 amount", async function () {
      await this.masterChef.add(5000, this.dgng.address, 0, false);
      await this.dgng.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      const depositLog = await this.masterChef.deposit(0, getBigNumber(1000));

      await advanceBlock();
      const dgngBalanceBefore = await this.dgng.balanceOf(
        this.signers[0].address
      );
      await advanceBlock();

      const userInfoBefore = await this.masterChef.userInfo(
        0,
        this.signers[0].address
      );
      // const withdrawLog = await this.masterChef.emergencyWithdraw(0);
      await expect(this.masterChef.emergencyWithdraw(0))
        .to.emit(this.masterChef, "EmergencyWithdraw")
        .withArgs(this.signers[0].address, 0, userInfoBefore.amount);

      const userInfoAfter = await this.masterChef.userInfo(
        0,
        this.signers[0].address
      );
      expect(userInfoAfter.amount).to.be.equal(0);
      expect(userInfoAfter.rewardDebt).to.be.equal(0);
    });
  });

  describe("stakeDragonUtility", function () {
    beforeEach(async function () {
      this.usedUtilityNFTId = 1;

      await this.masterChef.add(5000, this.dgng.address, 0, false);
      await this.dgng.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      await this.dragonUtility.mintPlank("https://xxxxx");
      await this.dragonUtility.buyDragonUtility(this.usedUtilityNFTId);
    });

    it("Should stake dragon utility", async function () {
      const dragonUtilityOwnerBefore = await this.dragonUtility.ownerOf(
        this.usedUtilityNFTId
      );
      expect(dragonUtilityOwnerBefore).to.be.equal(this.signers[0].address);

      await this.dragonUtility.approve(
        this.masterChef.address,
        this.usedUtilityNFTId
      );
      await this.masterChef.stakeDragonUtility(this.usedUtilityNFTId);

      const dragonUtilityOwnerAfter = await this.dragonUtility.ownerOf(
        this.usedUtilityNFTId
      );
      expect(dragonUtilityOwnerAfter).to.be.equal(this.masterChef.address);
    });
  });

  describe("withdrawDragonUtility", function () {
    beforeEach(async function () {
      this.usedUtilityNFTId = 1;

      await this.masterChef.add(5000, this.dgng.address, 0, false);
      await this.dgng.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      await this.dragonUtility.mintPlank("https://xxxxx");
      await this.dragonUtility.buyDragonUtility(this.usedUtilityNFTId);
    });

    it("Should withdraw dragon utility", async function () {
      await this.dragonUtility.approve(
        this.masterChef.address,
        this.usedUtilityNFTId
      );
      await this.masterChef.stakeDragonUtility(this.usedUtilityNFTId);

      const dragonUtilityOwnerBefore = await this.dragonUtility.ownerOf(
        this.usedUtilityNFTId
      );
      expect(dragonUtilityOwnerBefore).to.be.equal(this.masterChef.address);

      await this.masterChef.withdrawDragonUtility(this.usedUtilityNFTId);

      const dragonUtilityOwnerAfter = await this.dragonUtility.ownerOf(
        this.usedUtilityNFTId
      );
      expect(dragonUtilityOwnerAfter).to.be.equal(this.signers[0].address);
    });
  });
});
