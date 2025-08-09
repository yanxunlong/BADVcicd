// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract CCNCarnival {
    address public immutable owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    struct Stall {
        address payable stallOwner;
        string name;
        uint8 duration;
        uint totalCollected;
        uint netRevenue;
        bool registered;
        bool withdrawn;
    }

    mapping(uint => Stall) public stalls;
    mapping(uint => mapping(address => uint)) public payments;
    uint public stallCount;

    uint public maxStalls;

    event StallRegistered(uint indexed stallId, address indexed stallOwner, string name, uint8 duration);
    event PaymentMade(uint indexed stallId, address indexed user, uint amount);
    event RefundIssued(uint indexed stallId, address indexed user, uint amount);
    event WithdrawalMade(uint indexed stallId, address indexed stallOwner, uint amount);
    event MaxStallsUpdated(uint maxStalls);

    constructor() {
        owner = msg.sender;
        maxStalls = 0;
    }

    function setMaxStalls(uint _max) external onlyOwner {
        require(_max == 0 || _max >= stallCount, "Below current count");
        maxStalls = _max;
        emit MaxStallsUpdated(_max);
    }

    function registerStall(string memory _name, uint8 _duration) public {
        require(_duration >= 1 && _duration <= 3, "Invalid duration");

        require(maxStalls == 0 || stallCount < maxStalls, "Max stalls reached");

        stallCount++;
        stalls[stallCount] = Stall({
            stallOwner: payable(msg.sender),
            name: _name,
            duration: _duration,
            totalCollected: 0,
            netRevenue: 0,
            registered: true,
            withdrawn: false
        });

        emit StallRegistered(stallCount, msg.sender, _name, _duration);
    }

    function payToStall(uint _stallId) public payable {
        Stall storage s = stalls[_stallId];
        require(s.registered, "Stall not registered");
        require(msg.value > 0, "Must send ETH");

        s.totalCollected += msg.value;
        s.netRevenue    += msg.value; 
        payments[_stallId][msg.sender] += msg.value;

        emit PaymentMade(_stallId, msg.sender, msg.value);
    }

    function refundUser(uint _stallId, address payable _user, uint _amount) public {
        Stall storage s = stalls[_stallId];
        require(msg.sender == s.stallOwner, "Not stall owner");
        require(payments[_stallId][_user] >= _amount, "Refund exceeds payment");

        payments[_stallId][_user] -= _amount;
        s.totalCollected -= _amount;
        s.netRevenue    -= _amount; 
        _user.transfer(_amount);

        emit RefundIssued(_stallId, _user, _amount);
    }

    function withdraw(uint _stallId, uint _currentDay) public {
        Stall storage s = stalls[_stallId];
        require(msg.sender == s.stallOwner, "Not stall owner");
        require(!s.withdrawn, "Funds already withdrawn");
        require(_currentDay >= s.duration, "Stall still active");

        s.withdrawn = true;
        uint amount = s.totalCollected;
        s.totalCollected = 0;
        s.stallOwner.transfer(amount);

        emit WithdrawalMade(_stallId, s.stallOwner, amount);
    }

    function getTopStalls(uint k) external view returns (uint[] memory ids, uint[] memory revenues) {
        uint n = stallCount;
        if (k > n) k = n;

        ids = new uint[](k);
        revenues = new uint[](k);

        bool[] memory used = new bool[](n + 1); 
        for (uint rank = 0; rank < k; rank++) {
            uint bestId = 0;
            uint bestVal = 0;
            for (uint i = 1; i <= n; i++) {
                if (used[i]) continue;
                uint val = stalls[i].netRevenue;
                if (val > bestVal) {
                    bestVal = val;
                    bestId = i;
                }
            }
            if (bestId == 0) {
                break;
            }
            used[bestId] = true;
            ids[rank] = bestId;
            revenues[rank] = bestVal;
        }
    }

    receive() external payable {
        revert("Please use payToStall");
    }
}