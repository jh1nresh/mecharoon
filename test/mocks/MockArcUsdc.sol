// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

error MockArcUsdc__InsufficientBalance();
error MockArcUsdc__InsufficientAllowance();

contract MockArcUsdc {
    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool success) {
        allowance[msg.sender][spender] = amount;
        success = true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool success) {
        _transfer(msg.sender, recipient, amount);
        success = true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool success) {
        uint256 currentAllowance = allowance[sender][msg.sender];
        if (currentAllowance < amount) revert MockArcUsdc__InsufficientAllowance();
        allowance[sender][msg.sender] = currentAllowance - amount;
        _transfer(sender, recipient, amount);
        success = true;
    }

    function _transfer(address sender, address recipient, uint256 amount) private {
        uint256 senderBalance = balanceOf[sender];
        if (senderBalance < amount) revert MockArcUsdc__InsufficientBalance();
        balanceOf[sender] = senderBalance - amount;
        balanceOf[recipient] += amount;
    }
}
