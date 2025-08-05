// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract CCNCarnival {
    struct Stall {
        address payable owner;
        string name;
        uint8 duration; 
        uint totalCollected;
        bool registered;
        bool withdrawn;
    }

    mapping(uint => Stall) public stalls;

    mapping(uint => mapping(address => uint)) public payments;

    uint public stallCount;

    event StallRegistered(uint indexed stallId, address indexed owner, string name, uint8 duration);
    event PaymentMade(uint indexed stallId, address indexed user, uint amount);
    event RefundIssued(uint indexed stallId, address indexed user, uint amount);
    event WithdrawalMade(uint indexed stallId, address indexed owner, uint amount);


    function registerStall(string memory _name, uint8 _duration) public {
        require(_duration >= 1 && _duration <= 3, "Invalid duration");

        stallCount++;
        stalls[stallCount] = Stall({
            owner: payable(msg.sender),
            name: _name,
            duration: _duration,
            totalCollected: 0,
            registered: true,
            withdrawn: false
        });

        emit StallRegistered(stallCount, msg.sender, _name, _duration);
    }


    function payToStall(uint _stallId) public payable {
        require(stalls[_stallId].registered, "Stall not registered");
        require(msg.value > 0, "Must send ETH");

        stalls[_stallId].totalCollected += msg.value;
        payments[_stallId][msg.sender] += msg.value;

        emit PaymentMade(_stallId, msg.sender, msg.value);
    }

    function refundUser(uint _stallId, address payable _user, uint _amount) public {
        Stall storage stall = stalls[_stallId];
        require(msg.sender == stall.owner, "Not stall owner");
        require(payments[_stallId][_user] >= _amount, "Refund exceeds payment");

        payments[_stallId][_user] -= _amount;
        stall.totalCollected -= _amount;
        _user.transfer(_amount);

        emit RefundIssued(_stallId, _user, _amount);
    }


    function withdraw(uint _stallId, uint _currentDay) public {
        Stall storage stall = stalls[_stallId];
        require(msg.sender == stall.owner, "Not stall owner");
        require(!stall.withdrawn, "Funds already withdrawn");
        require(_currentDay >= stall.duration, "Stall still active");

        stall.withdrawn = true;
        uint amount = stall.totalCollected;
        stall.totalCollected = 0;
        stall.owner.transfer(amount);

        emit WithdrawalMade(_stallId, stall.owner, amount);
    }

    receive() external payable {
        revert("Please use payToStall");
    }
}
