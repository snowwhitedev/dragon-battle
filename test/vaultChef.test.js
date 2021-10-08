const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = ethers;
const {
  getBigNumber,
  QUICK_SWAP,
  WETH,
  createPair,
} = require("../scripts/shared");

const MASTER_CHEF_DGNG_PER_BLOCK = getBigNumber(5, 16); // 0.05 dgng per block

describe("Vault", function () {
  before(async function () {
    this.VaultChef = await ethers.getContractFactory("VaultChef");
    this.MasterChef = await ethers.getContractFactory("MasterChef");
    this.DragonUtility = await ethers.getContractFactory("DragonUtility");
    this.MockDGNG = await ethers.getContractFactory("MockDCAU");
    this.MockERC20 = await ethers.getContractFactory("MockERC20");
    this.StrategyMasterChef = await ethers.getContractFactory(
      "StrategyMasterChef"
    );
    this.StrategyMasterChefLP = await ethers.getContractFactory(
      "StrategyMasterChefLP"
    );

    this.signers = await ethers.getSigners();
    this.dev = this.signers[0];
    this.bob = this.signers[1];
    this.devWallet = this.signers[2];
  });

  beforeEach(async function () {
    this.vaultChef = await this.VaultChef.deploy();
    this.dgng = await this.MockDGNG.deploy(this.dev.address);
    this.usdc = await this.MockERC20.deploy(
      "Mock USDC",
      "MockUSDC",
      getBigNumber(10000000000)
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
      MASTER_CHEF_DGNG_PER_BLOCK, // 0.05 DGNG
      this.devWallet.address
    );
    await this.dgng.transferOwnership(this.masterChef.address);

    /** Basic actions */
    // create DGNG_WMATIC pair
    this.DGNG_WMATIC = await createPair(
      QUICK_SWAP.ROUTER,
      QUICK_SWAP.FACTORY,
      this.dgng.address,
      WETH,
      getBigNumber(10000),
      getBigNumber(50),
      this.dev.address,
      this.dev
    );

    // const dgngWmatic = await this.MockERC20.attatch(this.DGNG_WMATIC);
    // const currentBal = await dgngWmatic.balanceOf(this.dev);
    /** Add DGNG to MasterChef */
    await (
      await this.masterChef.add(50 * 100, this.dgng.address, 0, false)
    ).wait(); // poolID: 0
    await (
      await this.masterChef.add(100 * 100, this.DGNG_WMATIC, 0, false)
    ).wait(); // poolID: 1
  });

  describe("StrategyMasterChef", function () {
    beforeEach(async function () {
      this.dgngPoolId = 0;
      this.strategyMasterChefDGNG = await this.StrategyMasterChef.deploy(
        this.vaultChef.address,
        this.masterChef.address,
        QUICK_SWAP.ROUTER,
        this.dgngPoolId,
        this.dgng.address,
        this.dgng.address,
        [
          this.dgng.address,
          WETH, // this is WMATIC
        ]
      );
    });

    it("Vault Add pool", async function () {
      await this.vaultChef.addPool(this.strategyMasterChefDGNG.address);
      expect(await this.vaultChef.poolLength()).to.be.equal(1);
    });

    it("Vault Deposit", async function () {
      await this.vaultChef.addPool(this.strategyMasterChefDGNG.address);
      await this.dgng.approve(this.vaultChef.address, getBigNumber(1000000000));

      const testAmount = 123;
      await this.vaultChef.deposit(0, getBigNumber(testAmount));

      const userInfo = await this.vaultChef.userInfo(0, this.dev.address);

      expect(userInfo).to.be.equal(getBigNumber(testAmount));
    });

    it("Vault withdraw", async function () {});
  });

  describe("StrategyMasterChefLP", function () {
    beforeEach(async function () {
      this.dgngMaticPoolId = 1;
      this.strategyMasterChefLPDGNG_WMATIC =
        await this.StrategyMasterChefLP.deploy(
          this.vaultChef.address,
          this.masterChef.address,
          QUICK_SWAP.ROUTER,
          this.dgngMaticPoolId,
          this.DGNG_WMATIC, // the token which we want to put in pool
          this.dgng.address,
          [
            this.dgng.address,
            WETH, // this is WMATIC
          ],
          [this.dgng.address, this.dgng.address],
          [this.dgng.address, this.dgng.address],
          [this.dgng.address, WETH]
        );

      this.dgngWmatic = await this.MockERC20.attatch(this.DGNG_WMATIC);
    });

    it("Vault LP Deposit", async function () {
      await this.vaultChef.addPool(
        this.strategyMasterChefLPDGNG_WMATIC.address
      );
      const currentBal = await dgngWmatic.balanceOf(this.dev);
      await this.dgngWmatic.approve(
        this.vaultChef.address,
        getBigNumber(1000000000)
      );
      // 0.1 % of current balance
      const testAmount = ~~BigNumber.from(100).mul(currentBal).div(1000);
      await this.vaultChef.deposit(
        this.dgngMaticPoolId,
        getBigNumber(testAmount)
      );
      const userInfo = await this.vaultChef.userInfo(
        this.dgngMaticPoolId,
        this.dev.address
      );
      expect(userInfo).to.be.equal(getBigNumber(testAmount));
    });

    it("Vault withdraw", async function () {});
  });
});
