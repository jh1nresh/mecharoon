// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {IArcAgenticCommerce, IERC20Balance} from "contracts/interfaces/IArcAgenticCommerce.sol";
import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Vm} from "forge-std/Vm.sol";
import {MockArcUsdc} from "test/mocks/MockArcUsdc.sol";

contract ArcErc8183Handler {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    IArcAgenticCommerce private immutable commerce;
    address private immutable provider;
    address private immutable evaluator;
    uint256 private immutable jobId;
    uint256 private immutable expiredAt;

    constructor(
        IArcAgenticCommerce commerce_,
        address provider_,
        address evaluator_,
        uint256 jobId_,
        uint256 expiredAt_
    ) {
        commerce = commerce_;
        provider = provider_;
        evaluator = evaluator_;
        jobId = jobId_;
        expiredAt = expiredAt_;
    }

    function submit(bytes32 deliverable) external {
        VM.prank(provider);
        try commerce.submit(jobId, deliverable, "") {} catch {}
    }

    function complete(bytes32 reason) external {
        VM.prank(evaluator);
        try commerce.complete(jobId, reason, "") {} catch {}
    }

    function reject(bytes32 reason) external {
        VM.prank(evaluator);
        try commerce.reject(jobId, reason, "") {} catch {}
    }

    function expire() external {
        VM.warp(expiredAt);
        try commerce.claimRefund(jobId) {} catch {}
    }
}

contract ArcErc8183ForkTest is Test {
    address private constant ARC_ERC8183 = 0x0747EEf0706327138c69792bF28Cd525089e4583;
    address private constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    address private constant EXPECTED_IMPLEMENTATION = 0xA316fd02827242D537F84730F8a37D0BA5fd351a;
    uint256 private constant ARC_CHAIN_ID = 5_042_002;
    bytes32 private constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    bytes4 private constant UNAUTHORIZED = bytes4(keccak256("Unauthorized()"));
    bytes4 private constant WRONG_STATUS = bytes4(keccak256("WrongStatus()"));

    IArcAgenticCommerce private constant COMMERCE = IArcAgenticCommerce(ARC_ERC8183);
    IERC20Balance private constant USDC = IERC20Balance(ARC_USDC);

    address private client;
    address private provider;
    address private evaluator;
    address private outsider;

    function setUp() public {
        vm.createSelectFork(vm.envOr("ARC_TESTNET_RPC_URL", string("https://rpc.testnet.arc.io")));
        client = makeAddr("client");
        provider = makeAddr("provider");
        evaluator = makeAddr("evaluator");
        outsider = makeAddr("outsider");
    }

    function test_DeploymentMatchesPinnedArcConfiguration() external view {
        assertEq(block.chainid, ARC_CHAIN_ID);
        assertGt(ARC_ERC8183.code.length, 0);
        assertEq(COMMERCE.paymentToken(), ARC_USDC);
        assertEq(address(uint160(uint256(vm.load(ARC_ERC8183, IMPLEMENTATION_SLOT)))), EXPECTED_IMPLEMENTATION);
        assertGt(EXPECTED_IMPLEMENTATION.code.length, 0);
    }

    function testFuzz_ProviderSetsBudgetAndEvaluatorCompletes(uint96 rawBudget) external {
        uint256 budget = bound(uint256(rawBudget), 1, 1_000_000_000);
        (uint256 jobId,) = _createFundedJob(budget);

        vm.prank(provider);
        COMMERCE.submit(jobId, keccak256("deliverable"), "");

        uint256 clientBefore = USDC.balanceOf(client);
        uint256 escrowBefore = USDC.balanceOf(ARC_ERC8183);
        uint256 providerBefore = USDC.balanceOf(provider);
        uint256 evaluatorBefore = USDC.balanceOf(evaluator);
        address treasury = COMMERCE.platformTreasury();
        uint256 treasuryBefore = USDC.balanceOf(treasury);

        vm.prank(evaluator);
        COMMERCE.complete(jobId, keccak256("accepted"), "");

        uint256 platformFee = budget * COMMERCE.platformFeeBP() / 10_000;
        uint256 evaluatorFee = budget * COMMERCE.evaluatorFeeBP() / 10_000;
        uint256 providerPayment = budget - platformFee - evaluatorFee;
        IArcAgenticCommerce.Job memory job = COMMERCE.getJob(jobId);

        assertEq(uint256(job.status), uint256(IArcAgenticCommerce.JobStatus.Completed));
        assertEq(USDC.balanceOf(client), clientBefore);
        assertEq(USDC.balanceOf(ARC_ERC8183), escrowBefore - budget);
        assertEq(USDC.balanceOf(provider), providerBefore + providerPayment);
        assertEq(USDC.balanceOf(evaluator), evaluatorBefore + evaluatorFee);
        assertEq(USDC.balanceOf(treasury), treasuryBefore + platformFee);
    }

    function test_SetBudgetRevertsWhenCalledByClient() external {
        uint256 jobId = _createOpenJob(block.timestamp + 1 days);

        vm.expectRevert(UNAUTHORIZED);
        vm.prank(client);
        COMMERCE.setBudget(jobId, 5_000_000, "");
    }

    function test_SubmitRevertsWhenCalledByClient() external {
        (uint256 jobId,) = _createFundedJob(5_000_000);

        vm.expectRevert(UNAUTHORIZED);
        vm.prank(client);
        COMMERCE.submit(jobId, keccak256("deliverable"), "");
    }

    function test_CompleteRevertsWhenCalledByProvider() external {
        (uint256 jobId,) = _createFundedJob(5_000_000);
        vm.prank(provider);
        COMMERCE.submit(jobId, keccak256("deliverable"), "");

        vm.expectRevert(UNAUTHORIZED);
        vm.prank(provider);
        COMMERCE.complete(jobId, keccak256("accepted"), "");
    }

    function test_ClaimRefundRevertsBeforeExpiry() external {
        (uint256 jobId,) = _createFundedJob(5_000_000);

        vm.expectRevert(WRONG_STATUS);
        vm.prank(outsider);
        COMMERCE.claimRefund(jobId);
    }

    function testFuzz_ExpiredRefundReturnsFullBudgetToClient(uint96 rawBudget) external {
        uint256 budget = bound(uint256(rawBudget), 1, 1_000_000_000);
        (uint256 jobId, uint256 expiredAt) = _createFundedJob(budget);
        uint256 clientBefore = USDC.balanceOf(client);
        uint256 outsiderBefore = USDC.balanceOf(outsider);

        vm.warp(expiredAt);
        vm.prank(outsider);
        COMMERCE.claimRefund(jobId);

        IArcAgenticCommerce.Job memory job = COMMERCE.getJob(jobId);
        assertEq(uint256(job.status), uint256(IArcAgenticCommerce.JobStatus.Expired));
        assertEq(USDC.balanceOf(client), clientBefore + budget);
        assertEq(USDC.balanceOf(outsider), outsiderBefore);
    }

    function _createFundedJob(uint256 budget) private returns (uint256 jobId, uint256 expiredAt) {
        expiredAt = block.timestamp + 1 days;
        jobId = _createOpenJob(expiredAt);
        _installMockUsdcAndMint(client, budget);

        vm.prank(provider);
        COMMERCE.setBudget(jobId, budget, "");
        vm.prank(client);
        USDC.approve(ARC_ERC8183, budget);
        vm.prank(client);
        COMMERCE.fund(jobId, "");
    }

    function _installMockUsdcAndMint(address account, uint256 amount) private {
        // Arc USDC delegates transfers to a chain-specific system contract that
        // vanilla Foundry cannot execute. Only the fork's token code is replaced;
        // the deployed ERC-8183 proxy and implementation remain unchanged.
        MockArcUsdc mock = new MockArcUsdc();
        vm.etch(ARC_USDC, address(mock).code);
        MockArcUsdc(ARC_USDC).mint(account, amount);
    }

    function _createOpenJob(uint256 expiredAt) private returns (uint256 jobId) {
        vm.prank(client);
        jobId = COMMERCE.createJob(provider, evaluator, expiredAt, "mecharoon:fork-test", address(0));
    }
}

contract ArcErc8183InvariantTest is StdInvariant, Test {
    address private constant ARC_ERC8183 = 0x0747EEf0706327138c69792bF28Cd525089e4583;
    address private constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    uint256 private constant BUDGET = 5_000_000;

    IArcAgenticCommerce private constant COMMERCE = IArcAgenticCommerce(ARC_ERC8183);
    IERC20Balance private constant USDC = IERC20Balance(ARC_USDC);

    address private client;
    address private provider;
    address private evaluator;
    address private treasury;
    uint256 private jobId;
    uint256 private escrowBaseline;
    uint256 private trackedBalance;
    uint256 private clientBaseline;
    uint256 private providerBaseline;
    uint256 private evaluatorBaseline;
    uint256 private treasuryBaseline;

    function setUp() public {
        vm.createSelectFork(vm.envOr("ARC_TESTNET_RPC_URL", string("https://rpc.testnet.arc.io")));
        client = makeAddr("invariant-client");
        provider = makeAddr("invariant-provider");
        evaluator = makeAddr("invariant-evaluator");
        treasury = COMMERCE.platformTreasury();
        uint256 expiredAt = block.timestamp + 1 days;
        vm.prank(client);
        jobId = COMMERCE.createJob(provider, evaluator, expiredAt, "mecharoon:invariant", address(0));
        MockArcUsdc mock = new MockArcUsdc();
        vm.etch(ARC_USDC, address(mock).code);
        MockArcUsdc(ARC_USDC).mint(client, BUDGET);
        escrowBaseline = USDC.balanceOf(ARC_ERC8183);
        vm.prank(provider);
        COMMERCE.setBudget(jobId, BUDGET, "");
        vm.prank(client);
        USDC.approve(ARC_ERC8183, BUDGET);
        vm.prank(client);
        COMMERCE.fund(jobId, "");

        trackedBalance = _trackedBalance();
        clientBaseline = USDC.balanceOf(client);
        providerBaseline = USDC.balanceOf(provider);
        evaluatorBaseline = USDC.balanceOf(evaluator);
        treasuryBaseline = USDC.balanceOf(treasury);
        ArcErc8183Handler handler = new ArcErc8183Handler(COMMERCE, provider, evaluator, jobId, expiredAt);
        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = handler.submit.selector;
        selectors[1] = handler.complete.selector;
        selectors[2] = handler.reject.selector;
        selectors[3] = handler.expire.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
        targetContract(address(handler));
        targetSender(makeAddr("invariant-caller"));
    }

    function invariant_EscrowMatchesLifecycleStatus() external view {
        IArcAgenticCommerce.Job memory job = COMMERCE.getJob(jobId);
        uint256 escrowBalance = USDC.balanceOf(ARC_ERC8183);

        if (job.status == IArcAgenticCommerce.JobStatus.Funded || job.status == IArcAgenticCommerce.JobStatus.Submitted)
        {
            assertEq(escrowBalance, escrowBaseline + BUDGET);
        } else {
            assertTrue(
                job.status == IArcAgenticCommerce.JobStatus.Completed
                    || job.status == IArcAgenticCommerce.JobStatus.Rejected
                    || job.status == IArcAgenticCommerce.JobStatus.Expired
            );
            assertEq(escrowBalance, escrowBaseline);
        }
    }

    function invariant_TrackedUsdcIsConserved() external view {
        assertEq(_trackedBalance(), trackedBalance);
    }

    function invariant_CompletedJobPaysExactFeeSplit() external view {
        IArcAgenticCommerce.Job memory job = COMMERCE.getJob(jobId);
        if (job.status != IArcAgenticCommerce.JobStatus.Completed) {
            return;
        }

        uint256 platformFee = BUDGET * COMMERCE.platformFeeBP() / 10_000;
        uint256 evaluatorFee = BUDGET * COMMERCE.evaluatorFeeBP() / 10_000;
        assertEq(USDC.balanceOf(provider), providerBaseline + BUDGET - platformFee - evaluatorFee);
        assertEq(USDC.balanceOf(evaluator), evaluatorBaseline + evaluatorFee);
        assertEq(USDC.balanceOf(treasury), treasuryBaseline + platformFee);
        assertEq(USDC.balanceOf(client), clientBaseline);
    }

    function invariant_TerminalRefundReturnsExactBudget() external view {
        IArcAgenticCommerce.Job memory job = COMMERCE.getJob(jobId);
        if (
            job.status != IArcAgenticCommerce.JobStatus.Rejected
                && job.status != IArcAgenticCommerce.JobStatus.Expired
        ) {
            return;
        }

        assertEq(USDC.balanceOf(client), clientBaseline + BUDGET);
        assertEq(USDC.balanceOf(provider), providerBaseline);
        assertEq(USDC.balanceOf(evaluator), evaluatorBaseline);
        assertEq(USDC.balanceOf(treasury), treasuryBaseline);
    }

    function _trackedBalance() private view returns (uint256 balance) {
        balance = USDC.balanceOf(client) + USDC.balanceOf(provider) + USDC.balanceOf(evaluator)
            + USDC.balanceOf(treasury) + USDC.balanceOf(ARC_ERC8183);
    }
}
