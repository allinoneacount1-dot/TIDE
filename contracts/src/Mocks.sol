// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    uint8 private _decimals = 6;
    constructor() ERC20("Mock USDC", "USDC") {}
    function decimals() public view override returns (uint8) { return _decimals; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockTarget is ERC20 {
    constructor() ERC20("Mock AAPL.x", "AAPLx") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockAggregator {
    // Simple 1:1 swap mock: takes USDC, sends targetToken from its balance
    // swapData is ignored except for amount encoded as first 32 bytes
    // In real test we encode amountOut expectation
    address public target;
    uint256 public rate = 1e12; // 1 USDC (6 decimals) -> 1 target (18 decimals) => 1e12 scaling

    constructor(address _target) { target = _target; }

    // Fallback to handle arbitrary swapData: we treat call as swap(amount)
    fallback() external payable {
        // try to decode amount from calldata (last 32 bytes if present)
        // For simplicity, use msg.value? No — we do ERC20 transferFrom logic in vault, so here we just send target
        // Vault has already approved and will call aggregator.call(swapData) — but no transferFrom here.
        // To simulate, we need vault to have done transfer to aggregator before call.
        // Simpler: aggregator just mints target to caller
    }

    function swap(address vault, uint256 amountIn, uint256 minOut) external {
        // not used in TideVault low-level call path; we use mock that vault calls with arbitrary data and we send back target
        // This function is for explicit test helper
        uint256 out = amountIn * 1e12; // 6 -> 18 decimals
        require(out >= minOut, "SLIPPAGE");
        MockTarget(target).mint(vault, out);
    }

    // This is what TideVault low-level call will hit if swapData = abi.encodeWithSelector(this.mockSwap.selector, amountIn)
    function mockSwap(uint256 amountIn) external {
        // Vault is msg.sender? Actually vault calls aggregator.call(swapData) where swapData encodes mockSwap
        // So msg.sender = vault
        uint256 out = amountIn * 1e12;
        MockTarget(target).mint(msg.sender, out);
    }
}
