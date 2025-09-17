# Projektarchitektur von FooCoin

## Überblick
FooCoin implementiert eine minimalistische Kryptowährung mit einem Python-Backend. Das System besteht aus einer Blockchain-Kernlogik, Wallet- und Transaktionskomponenten, einem Pub/Sub-basierten Synchronisationslayer sowie einer Flask-Anwendung, die die Funktionen als HTTP-API bereitstellt. Die Module sind klar in Klassen organisiert, die jeweils eine spezifische Verantwortung übernehmen und über wohldefinierte Schnittstellen miteinander interagieren.

## Konfigurations- und Hilfskomponenten
### Globale Konstanten
`backend/config.py` bündelt alle Protokoll-Parameter, darunter Mining-Dauer, Belohnungshöhe, Initialguthaben und die Längenbeschränkungen für Adressen und Transaktions-IDs. Diese Konstanten werden von nahezu allen Kernklassen verwendet und ermöglichen es, das Verhalten der Blockchain zentral anzupassen.

### Hashing-Dienst
`backend/blockchain/hashing.py` stellt mit der Funktion `hashing(*args)` die einheitliche Hash-Berechnung zur Verfügung. Indem alle Argumente serialisiert, alphabetisch sortiert und anschließend mit SHA-256 gehasht werden, stellt die Funktion sicher, dass Blöcke und Transaktionen deterministisch signiert werden können.

## Blockchain-Kern
### Block
Die Klasse `Block` in `backend/blockchain/block.py` speichert alle Felder eines Blocks: Zeitstempel, vorherigen Hash, aktuellen Hash, Nutzdaten (Transaktionen), Schwierigkeit und Nonce. Die Hilfsfunktionen `mine`, `adj_diff`, `check_block` und `json_to_block` kapseln die Lebenszyklen eines Blocks. `mine` sucht über Proof-of-Work nach einem passenden Nonce, `adj_diff` passt die Schwierigkeit basierend auf dem Mining-Takt an, und `check_block` validiert eingehende Blöcke.

### Blockchain
Die Klasse `Blockchain` (`backend/blockchain/blockchain.py`) verwaltet eine Liste von `Block`-Instanzen und initialisiert sie mit einem vordefinierten Genesis-Block. Über `add` werden neue Blöcke erstellt (unter Nutzung von `mine`), während `replace` ganze Ketten austauscht. Die Validierung wird über die Funktionen `check_chain` und `check_tx_chain` organisiert: Sie prüfen Blockintegrität, Difficulty-Anpassungen und die Einbettung gültiger Transaktionen.

## Wallets und Transaktionen
### Wallet
`backend/wallet/wallet.py` definiert die Klasse `Wallet`. Sie erzeugt Adressen und Schlüsselpaare auf Basis von SECP256K1, serialisiert den öffentlichen Schlüssel für den Versand über das Netzwerk und stellt mit der Methode `sign` digitale Signaturen bereit. Die Eigenschaft `balance` nutzt `cal_bal`, um den Kontostand einer Adresse aus der gesamten Blockchain zu rekonstruieren.

### Transaction
Die Klasse `Transaction` (`backend/wallet/transaction.py`) modelliert Transfers zwischen Wallets. Sie erzeugt Ausgabestrukturen (`output`) mit Empfänger- und Senderanteil, erstellt den Input (inklusive Signatur) und bietet mit `update` die Möglichkeit, bestehende Transaktionen um weitere Empfänger zu erweitern. Ergänzend liefern `reward_tx` die Mining-Belohnung, `json_to_tx` die Deserialisierung und `check_tx` die zentrale Transaktionsvalidierung (Signaturen, Bilanzgleichheit, Einzigartigkeit von Mining-Rewards).

### Transaktionspool
Der `TxPool` (`backend/wallet/tx_pool.py`) verwaltet ausstehende Transaktionen in einer Map. `set_tx` aktualisiert oder fügt Transaktionen anhand ihrer IDs ein, `existing_tx` erlaubt pro Wallet das Weiterverarbeiten bereits vorhandener Transaktionen, `tx_data` liefert JSON-Serien für neue Blöcke und `clear_blockchain_tx` entfernt bestätigte Transaktionen nach erfolgreichem Mining.

## Kommunikation und Synchronisation
Das Modul `backend/pubsub.py` kapselt die verteilte Synchronisation zwischen Knoten über PubNub. Die Klasse `PubSub` richtet die Verbindung ein, abonniert die Kanäle `BLOCK` und `TX` und bietet Hilfsmethoden zum Veröffentlichen neuer Blöcke oder Transaktionen. Die innere Listener-Klasse verarbeitet eingehende Nachrichten: Für neue Blöcke wird eine Kopie der aktuellen Kette erstellt, der Block angefügt und anschließend über `Blockchain.replace` übernommen; parallel räumt `TxPool.clear_blockchain_tx` bestätigte Transaktionen auf. Eingehende Transaktionen werden direkt an den lokalen Pool weitergereicht.

## API-Schicht
Die Flask-Anwendung (`backend/app/__init__.py`) fungiert als Fassade über die oben beschriebenen Klassen. Beim Start legt sie eine `Blockchain`-Instanz, das zugehörige `Wallet`, den `TxPool` sowie den `PubSub`-Client an. Die Routen decken die wichtigsten Anwendungsfälle ab:
- **Blockchain-Endpunkte**: Lesen der gesamten Kette, pagination und Mining (`/api/blockchain`, `/api/blockchain/page`, `/api/blockchain/mine`). Beim Mining werden zunächst alle Pool-Transaktionen gesammelt, eine Belohnungstransaktion erzeugt, ein neuer Block hinzugefügt und anschließend an andere Knoten veröffentlicht.
- **Wallet-Endpunkte**: Über `/api/wallet/info` werden Adresse und Guthaben des lokalen Wallets geliefert; `/api/wallet/transact` erstellt oder erweitert Transaktionen des lokalen Wallets.
- **Netzwerk-Endpunkte**: `/api/transactions` liefert den aktuellen Transaktionspool, während `/api/known-addresses` bekannte Empfänger aus der bisherigen Kette extrahiert.

Für Peer-Knoten kann die Anwendung beim Start (`PEER`-Umgebungsvariable) die Blockchain eines Referenzknotens abrufen und über `Blockchain.replace` synchronisieren. Alternativ erzeugt ein Seed-Knoten (`SEED`-Flag) zufällige Blöcke und Transaktionen, um Testdaten bereitzustellen.

## Zusammenspiel der Klassen
1. **Erstellen von Transaktionen**: Das Wallet signiert neue Transaktionen, die der `TxPool` verwaltet und optional erweitert.
2. **Mining**: Beim Mining liest die Flask-Route alle Pool-Transaktionen, ergänzt sie um eine Belohnung (`reward_tx`), übergibt sie an `Blockchain.add`, das wiederum `Block.mine` nutzt, und verteilt den Block über `PubSub`.
3. **Validierung und Synchronisation**: Eingehende Blöcke werden über den Listener geprüft (`Blockchain.replace` ruft `check_chain` auf), und bestätigte Transaktionen werden aus dem Pool entfernt. Damit greifen Blockchain, TxPool und PubSub ineinander.
4. **Kontostand-Berechnung**: Die Wallet-Instanz fragt ihren Kontostand jederzeit über `cal_bal` ab, das auf die aktuelle Blockchain zugreift. Somit beeinflussen bestätigte Transaktionen direkt den Wallet-Zustand.

Diese Struktur trennt Verantwortlichkeiten sauber und ermöglicht es, die FooCoin-Implementierung modular zu erweitern oder auszutauschen – etwa durch alternative Konsensmechanismen, zusätzliche Validierungsregeln oder neue API-Endpunkte.
