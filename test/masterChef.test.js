const { expect, assert } = require("chai");
// const { providers } = require("ethers");
const { ethers } = require("hardhat");
const {
  DCAU_PRE_MINT,
  getBigNumber,
  advanceBlock,
} = require("../scripts/shared");

const DCAU_PER_BLOCK = getBigNumber(5, 16); // 0.05 dcau per block
const DCAU_REWARD_PERIOD = 15; // reward every 15 seconds

describe("MasterChef", function () {
  before(async function () {
    this.MasterChef = await ethers.getContractFactory("MasterChef");
    this.DragonUtility = await ethers.getContractFactory("DragonUtility");
    this.MockDCAU = await ethers.getContractFactory("MockDCAU");
    this.MockERC20 = await ethers.getContractFactory("MockERC20");
    this.signers = await ethers.getSigners();
    this.alice = this.signers[0];
    this.bob = this.signers[1];
    this.devWallet = this.signers[2];
    this.dev = this.signers[0];
  });

  beforeEach(async function () {
    this.dcau = await this.MockDCAU.deploy(this.dev.address);
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
      this.dcau.address,
      this.dragonUtility.address,
      this.dev.address,
      0,
      DCAU_PER_BLOCK, // 0.05 DCAU
      this.devWallet.address
    );

    this.dcau.transferOwnership(this.masterChef.address);
  });

  describe("PoolLength", function () {
    it("PoolLength should be increased", async function () {
      await this.masterChef.add(50 * 100, this.dcau.address, 0, false);
      expect(await this.masterChef.poolLength()).to.be.equal(1);
    });

    it("Each Pool can not be added twice", async function () {
      await this.masterChef.add(50 * 100, this.dcau.address, 0, false);
      expect(await this.masterChef.poolLength()).to.be.equal(1);

      await expect(
        this.masterChef.add(50 * 100, this.dcau.address, 0, false)
      ).to.be.revertedWith("nonDuplicated: duplicated");
    });
  });

  describe("Set", function () {
    it("Should emit SetPool", async function () {
      await this.masterChef.add(50 * 100, this.dcau.address, 0, false);
      await expect(this.masterChef.set(0, 60 * 100, 100, false))
        .to.emit(this.masterChef, "SetPool")
        .withArgs(0, this.dcau.address, 60 * 100, 100);
    });

    it("Should revert if invalid pool", async function () {
      await expect(
        this.masterChef.set(2, 60 * 100, 100, false)
      ).to.be.revertedWith("Transaction reverted without a reason string");
    });
  });

  describe("Pending DCAU", function () {
    it("PendingDCAU should equal ExpectedDCAU", async function () {
      await this.masterChef.add(5000, this.dcau.address, 0, false);
      await this.dcau.approve(
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

      const expectedDCAU = DCAU_PER_BLOCK.mul(
        ~~((block2.timestamp - block1.timestamp) / DCAU_REWARD_PERIOD)
      )
        .mul(975)
        .div(1000);

      const pendingDCAU = await this.masterChef.pendingDcau(
        0,
        this.alice.address
      );

      expect(expectedDCAU).to.be.equal(pendingDCAU);
    });
  });

  describe("Deposit", function () {
    beforeEach(async function () {
      await this.masterChef.add(5000, this.dcau.address, 0, false);
      await this.dcau.approve(
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
      await this.masterChef.add(5000, this.dcau.address, 0, false);
      await this.dcau.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      const depositLog = await this.masterChef.deposit(0, getBigNumber(1000));

      await advanceBlock();
      const dcauBalanceBefore = await this.dcau.balanceOf(this.alice.address);
      await advanceBlock();
      const withdrawLog = await this.masterChef.withdraw(0, 0);

      const block1 = await ethers.provider.getBlock(withdrawLog.blockNumber);
      const block2 = await ethers.provider.getBlock(depositLog.blockNumber);

      const expectedDCAU = DCAU_PER_BLOCK.mul(
        ~~((block2.timestamp - block1.timestamp) / DCAU_REWARD_PERIOD)
      )
        .mul(975)
        .div(1000);

      const dcauBalanceAfter = await this.dcau.balanceOf(this.alice.address);

      expect(expectedDCAU.add(dcauBalanceBefore)).to.be.equal(dcauBalanceAfter);
    });

    // TODO should revert invalid pool
  });

  describe("EmergencyWithdraw", function () {
    beforeEach(async function () {});

    it("EmergencyWithdraw 0 amount", async function () {
      await this.masterChef.add(5000, this.dcau.address, 0, false);
      await this.dcau.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      const depositLog = await this.masterChef.deposit(0, getBigNumber(1000));

      await advanceBlock();
      const dcauBalanceBefore = await this.dcau.balanceOf(this.alice.address);
      await advanceBlock();

      const userInfoBefore = await this.masterChef.userInfo(
        0,
        this.alice.address
      );
      // const withdrawLog = await this.masterChef.emergencyWithdraw(0);
      await expect(this.masterChef.emergencyWithdraw(0))
        .to.emit(this.masterChef, "EmergencyWithdraw")
        .withArgs(this.alice.address, 0, userInfoBefore.amount);

      const userInfoAfter = await this.masterChef.userInfo(
        0,
        this.alice.address
      );
      expect(userInfoAfter.amount).to.be.equal(0);
      expect(userInfoAfter.rewardDebt).to.be.equal(0);
    });
  });

  describe("stakeDragonUtility", function () {
    beforeEach(async function () {
      this.usedUtilityNFTId = 1;

      await this.masterChef.add(5000, this.dcau.address, 0, false);
      await this.dcau.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      await this.dragonUtility.mintUtility("https://xxxxx");
      await this.dragonUtility.buyDragonUtility(this.usedUtilityNFTId);
    });

    it("Should stake dragon utility", async function () {
      const dragonUtilityOwnerBefore = await this.dragonUtility.ownerOf(
        this.usedUtilityNFTId
      );
      expect(dragonUtilityOwnerBefore).to.be.equal(this.alice.address);

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

      await this.masterChef.add(5000, this.dcau.address, 0, false);
      await this.masterChef.add(500, this.usdc.address, 400, false);

      await this.dcau.approve(
        this.masterChef.address,
        getBigNumber(1000000000000000)
      );
      await this.masterChef.deposit(0, getBigNumber(5000));

      await this.dcau.transfer(this.bob.address, getBigNumber(10000));

      await this.dcau
        .connect(this.bob)
        .approve(this.masterChef.address, getBigNumber(5000));
      await this.masterChef.connect(this.bob).deposit(0, getBigNumber(5000));

      await this.usdc.approve(this.masterChef.address, getBigNumber(100000000));
      await this.masterChef.deposit(1, getBigNumber(2000));

      await this.usdc.transfer(this.bob.address, getBigNumber(10000));

      await this.usdc
        .connect(this.bob)
        .approve(this.masterChef.address, getBigNumber(2000));
      await this.masterChef.connect(this.bob).deposit(1, getBigNumber(2000));

      await this.dragonUtility.mintUtility("https://xxxxx");
      await this.dragonUtility.buyDragonUtility(this.usedUtilityNFTId);
      await this.dragonUtility.approve(
        this.masterChef.address,
        this.usedUtilityNFTId
      );
      await this.masterChef.stakeDragonUtility(this.usedUtilityNFTId);
    });

    it("Should withdraw dragon utility", async function () {
      const dragonUtilityOwnerBefore = await this.dragonUtility.ownerOf(
        this.usedUtilityNFTId
      );
      expect(dragonUtilityOwnerBefore).to.be.equal(this.masterChef.address);

      const poolLen = await this.masterChef.poolLength();
      const poolInfoBefore = [];
      const poolInfoAfter = [];

      for (let i = 0; i < poolLen; i++) {
        const poolInfo = await this.masterChef.poolInfo(i);
        const lpToken = await this.MockERC20.attach(poolInfo.lpToken);
        const balanceBefore = await lpToken.balanceOf(this.alice.address);
        poolInfoBefore.push({ balanceBefore });
      }

      await this.masterChef.withdrawDragonUtility(this.usedUtilityNFTId);

      for (let i = 0; i < poolLen; i++) {
        const poolInfo = await this.masterChef.poolInfo(i);
        const lpToken = await this.MockERC20.attach(poolInfo.lpToken);
        const balanceAfter = await lpToken.balanceOf(this.alice.address);
        const poolDragonNestInfo = await this.masterChef.poolDragonNestInfo(i);
        const dragonNestInfo = await this.masterChef.dragonNestInfo(i, 1);

        poolInfoAfter.push({
          balanceAfter,
          poolDragonNestInfo,
          dragonNestInfo,
        });
      }

      for (let i = 0; i < poolLen; i++) {
        expect(
          poolInfoAfter[i].balanceAfter.sub(poolInfoBefore[i].balanceBefore)
        ).to.be.equal(
          poolInfoAfter[i].poolDragonNestInfo.accDepFeePerShare.sub(
            poolInfoAfter[i].dragonNestInfo
          )
        );
      }

      const dragonUtilityOwnerAfter = await this.dragonUtility.ownerOf(
        this.usedUtilityNFTId
      );
      expect(dragonUtilityOwnerAfter).to.be.equal(this.alice.address);
    });

    it("updatePoolDragonNest -1", async function () {
      // check poolDragonNestInfo, dragonNetInfo state
      const USDCPoolDragonNestInfoBefore =
        await this.masterChef.poolDragonNestInfo(1);

      const expecedPendingDepFee = getBigNumber(4000)
        .mul(4)
        .mul(10)
        .div(100)
        .div(100);

      expect(expecedPendingDepFee).to.be.equal(
        USDCPoolDragonNestInfoBefore.pendingDepFee
      );

      // trying update pool
      await this.masterChef.massUpdatePoolDragonNests();
      const USDCPoolDragonNestInfoAfter =
        await this.masterChef.poolDragonNestInfo(1);

      // compare expected value(calc in javascript side) with changed
      expect(USDCPoolDragonNestInfoAfter.accDepFeePerShare).to.be.equal(
        USDCPoolDragonNestInfoBefore.pendingDepFee
      );
    });
  });
});
