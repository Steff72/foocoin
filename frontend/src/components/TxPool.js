import React, { useState, useEffect } from 'react'

import Transaction from './Transaction'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHammer, faSwimmingPool } from '@fortawesome/free-solid-svg-icons'


import { backend } from '../config'


const TxPool = () => {
    const [tx, settx] = useState([])
    const [showAlert, setshowAlert] = useState(false)


    const fetchTx = async () => {
        const response = await backend.get('/transactions')
        settx(response.data)
    }

    useEffect(() => {
        fetchTx()

        // check for new Tx every 5 seconds
        const iId = setInterval(fetchTx, 5000)

        // stop checking when component unmounts
        return () => clearInterval(iId)
    }, [])

    const mine = async () => {
        await backend.post('/blockchain/mine')
        
        setshowAlert(true)
        // window.location.reload()
    }

    const TxList = () => {
        if (tx.length !== 0) {
            return (
                <div>
                {
                    tx.map(t => (
                        <div key={t.id}>
                            <hr />
                            <Transaction transaction={t} />
                        </div>
                    ))
                }
            </div>
            )
        }
        return <div>No open Transactions.</div>
    }

    const AlertMsg = () => {
        if (showAlert) {
            return (
                <Alert variant="dark" onClose={() => {
                    setshowAlert(false)
                    settx('')
                }} dismissible>
                New Block mined!
                </Alert>
            )
        }
        return <div></div>

    }

    
    return (
        <div className="TransactionPool">
            <h3>Transaction Pool  <FontAwesomeIcon icon={faSwimmingPool} /></h3>
            <AlertMsg />
            <TxList />
            <hr />
            <Button
                disabled={!tx.length>0}
                variant="outline-light"
                onClick={mine}
            >
                Mine a new Block <FontAwesomeIcon icon={faHammer} />
            </Button>
        </div>
    )
}

export default TxPool