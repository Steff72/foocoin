**FooCoin - CS50W Final Project**

Cryptocurrency and Blockchain. FooCoin, with the purpose of replacing the USD as World Reserve Currency in the near future...:-)

The frontend is written in React with hooks. It is a single page application and the different components connect to the backend api. React-Bootstrap is used to style the page. The index.html and the static folder from the react build were moved to the backend app folder for the server to serve the app on the '/' route.

In the python backend, an instance of a node is running on a flask server. The server hosts an api and also the index.html file. To cope with the decentralized nature of a blockchain, a server only hosts one instance of a node. So everyone who wants to paticipate in the blockchain must have his own node on his own server.

The nodes communicate via messages on a PubSub network created with Pubnub. When a new transaction is published, the nodes check the validity and add it to the transaction pool if valid. When a new block is published, it is recalculated and each transaction is checked by each node before they add it to their instance of the blockchain. The transactions the block are then cleared from the transaction pool.

When a peer node is started up, it will connect to the root node to get a copy of the blockchain. After checking block by block and transaction by transaction it will replace the own  blockchain with the received one.
The root node is running on 157.230.100.162 

The peer node also creates a instance of a wallet with a public and private keypair needed to send and sign transactions. A transaction consits of an input and a output dict. The whole amount of the sender's wallet goes into the input. The output contains at least 2 fields. One for the recipient and his amount, and one to return the change (amount from input minus amount for the recipient) to the sender. The balance of a wallet is calculated by traversing the blockchain backwards until a input from this wallet address is found. From there outputs to this address are added up.

A Block contains a timestamp, the hash of the previous block ( which connects the blocks to a chain ), the hash of itself, the data containing the transactions, a difficulty ( which is adjusted to issue blocks at a given rate ) and the nounce which was used to mine this block.

To mine a new block, all the values are given to the hash algo over and over again, increasing the nounce value by one until the resulting hash contains as many leading zeros as dictated by the difficulty. 
Like this it is difficult and expensive to find a block, but easy to check it when the nounce is known. When a block is found it is added to the local chain and published in the block channel to the other nodes. The wallet of the node mining the block receives a minig reward transaction. This way new FooCoins are created.


To run a node locally and connect to the blockchain: 

activate venv: source foocoin-env/bin/activate

run peer server: export PEER=True && python3 -m backend.app

-------------------------------------------------------------------------

caution: running other than a PEER node will conflict with root node  running on 157.230.100.162!

    only for developpment: run root node: python3 -m backend.app. adjust __init__.py

    only for developpment: run root node with data seed: export SEED=True && python3 -m backend.app. adjust __init__.py


caution: running frontend not necessary as index.html is served at '/'.

    only for developpment: run frontend: in frontend directory: npm start. config file in front must be adjusted before.

update react part: npm run build, put static folder from build into backend/app folder and index.html into templates folder.

see package.json in /frontend for installed node dependencies.
see requirements.txt for installed python modules.