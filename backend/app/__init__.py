import os
import random
import requests

from flask import Flask, jsonify, request, render_template
from flask_cors import CORS

from backend.blockchain.blockchain import Blockchain, json_to_blockchain
from backend.wallet.wallet import Wallet
from backend.wallet.transaction import Transaction, reward_tx
from backend.wallet.tx_pool import TxPool
from backend.pubsub import PubSub


app = Flask(__name__)
 # Cross-origin resource sharing setup
CORS(app, resources={ r'/*': { 'origins': '*' } })
# avoid sorting of output and input transaction
app.config['JSON_SORT_KEYS'] = False

foochain = Blockchain()
wallet = Wallet(foochain)
tx_pool = TxPool()
pubsub = PubSub(foochain, tx_pool)


@app.route('/')
def default():
    return render_template('index.html')


@app.route('/api/blockchain')
def blockchain():
    return jsonify(foochain.json())


@app.route('/api/blockchain/page')
def page():
    start = int(request.args.get('start'))
    end = int(request.args.get('end'))

    return jsonify(foochain.json()[::-1][start:end])


@app.route('/api/blockchain/length')
def length():
    return jsonify(len(foochain.chain))


@app.route('/api/blockchain/mine', methods=['POST'])
def mine():
    tx_data = tx_pool.tx_data()
    tx_data.append(reward_tx(wallet).__dict__)
    foochain.add(tx_data)
    block = foochain.chain[-1]
    pubsub.publish_block(block)
    tx_pool.clear_blockchain_tx(foochain)

    return jsonify(block.__dict__)


@app.route('/api/wallet/transact', methods=['POST'])
def transact():
    tx_data = request.get_json()
    tx = tx_pool.existing_tx(wallet.address)

    if tx:
        tx.update(wallet, tx_data['recipient'], tx_data['amount'])
    else:
        tx = Transaction(wallet, tx_data['recipient'], tx_data['amount'])
    
    pubsub.publish_tx(tx)

    return jsonify(tx.__dict__)


@app.route('/api/wallet/info')
def info():
    return jsonify({ 'address': wallet.address, 'balance': wallet.balance })


@app.route('/api/known-addresses')
def known_addresses():
    known_addresses = set()

    for block in foochain.chain:
        for tx in block.data:
            outputAdresses = tx['output'].keys()

            if wallet.address in outputAdresses:
                known_addresses.update(outputAdresses)

        known_addresses.discard(wallet.address)

    return jsonify(list(known_addresses))


@app.route('/api/transactions')
def transactions():
    return jsonify(tx_pool.tx_data())



PORT = 5000

if os.environ.get('PEER') == 'True':
    PORT = random.randint(5001, 6000)

    # synchronize blockchain at startup for PEERS
    response = requests.get('http://localhost:5000/api/blockchain')
    blockchain = json_to_blockchain(response.json())

    try:
        foochain.replace(blockchain.chain)
        print('\n -- Local chain updated.')
    except Exception as e:
        print(f'\n -- Chain sync error: {e}')

if os.environ.get('SEED') == 'True':
    for i in range(10):
        foochain.add([
            Transaction(Wallet(), Wallet().address, random.randint(2, 50)).__dict__,
            Transaction(Wallet(), Wallet().address, random.randint(2, 50)).__dict__
        ])

    for i in range(3):
        tx_pool.set_tx(Transaction(Wallet(), Wallet().address, random.randint(2,50)))

app.run(port=PORT)