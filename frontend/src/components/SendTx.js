import React, { useState, useEffect } from 'react'

import FormGroup from 'react-bootstrap/FormGroup'
import FormControl from 'react-bootstrap/FormControl'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAddressBook, faPaperPlane, faCoins } from '@fortawesome/free-solid-svg-icons'

import { backend } from '../config'

const SendTx = () => {
    const [amount, setamount] = useState(0)
    const [recipient, setrecipient] = useState('')
    const [showAlert, setshowAlert] = useState(false)
    const [knownAddresses, setknownAddresses] = useState([])

    const fetchKnownAddresses = async () => {
        const response = await backend.get('/known-addresses')
        setknownAddresses(response.data)
    }

    useEffect(() => {
        fetchKnownAddresses()

        // check Info every 5 seconds
        const iId = setInterval(fetchKnownAddresses, 5000)

        // cleanup 
        return () => clearInterval(iId)
    }, [])

    const handleRecipient = event => setrecipient(event.target.value)
    const handleAmount = event => setamount(Number(event.target.value))

    const submitTx = async () => {
        const response = await backend.post('/wallet/transact', { recipient, amount })
        console.log(response.data)
        setshowAlert(true)
    }

    const AlertMsg = () => {
        if (showAlert) {
            return (
                <Alert variant="dark" onClose={() => {
                    setshowAlert(false)
                    setamount(0)
                    setrecipient('')
                }} dismissible>
                Transaction sent!
                </Alert>
            )
        }
        return <div></div>

    }

    const KnownAddresses = () => {
        if (knownAddresses.length !== 0) {
            return (
                <div>
                {
                    knownAddresses.map((kA, i) => (
                        <span key={kA}><u>{kA}</u>{i !== knownAddresses.length - 1 ? ', ' : ''}</span>
                    ))
                }
            </div>
            )
        }
        return <div>None so far...</div>
    }


    return (
        <div className="Send-Tx">
            <h3>Make a Transaction  <FontAwesomeIcon icon={faCoins} /></h3>
            <AlertMsg />
            <FormGroup>
                <FormControl 
                    input="text"
                    placeholder="Recipient"
                    value={recipient}
                    onChange={handleRecipient}
                />
            </FormGroup>
            <FormGroup>
                <FormControl 
                    input="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={handleAmount}
                />
            </FormGroup>
            <div>
                <Button
                    disabled={!recipient || amount < 1}
                    variant="outline-light"
                    onClick={submitTx}
                >Submit  <FontAwesomeIcon icon={faPaperPlane} /></Button>
            </div>
            <br />
            <h4>Known Addresses  <FontAwesomeIcon icon={faAddressBook} /></h4>
            <KnownAddresses />
        </div>
    )
}

export default SendTx