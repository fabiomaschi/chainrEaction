# Structure of this repo

- folder `chaincode` contains chaincode (i.e. smart contract logic)
- folder `supplychain` contains the client code to use the smart contract
    - folder `supplychain/typescript` contains the client code in typescript
    - folder `supplychain/app` contains the web app in flask to use the smart contract
- folder `first-network` contains the basic network configuration for our application (taken from the fabric-samples repo)

# Starting the application
- run `./teardownAll.sh` (if you already used it in the past)
- run `./startFabric.sh` (this may take a few minutes and will compile the chaincode and start the network and also to compile the client code and bootstrap a local wallet)
- run `./runWebApp.sh` (this will launch the web server)
- run `./launchBrowser` (opens a browser with a tab for one farmer (F0), one shipper (S0) and the evaluator)

To compile the client code again you can run `npm run build` from `supplychain/typescript`.

# Extending the project

When creating a new app/contract you can (and possibly should) change the "supplychain" string by:
- editing {.,chaincode}/supplychain/typescript/package.json and replacing the "name" field
- changing CONTRACT_NAME in contractConfig.sh
- change contractName and directory in the beginning of supplychain/typescript/src/client.ts
- renaming folders {.,chaincode}/supplychain;
- changing class/type names wherever you find it appropriate


# Installing prerequisites (only if not in the VM)

1. Follow instructions here to install Fabric:
   `https://hyperledger-fabric.readthedocs.io/en/release-1.4/prereqs.html`
   Note that when installing docker, you might have to reboot after adding your user to the docker group.
2.  Install Node.js version 8 from here:
   `https://github.com/nodesource/distributions/blob/master/README.md#deb`
3. Install typescript
   `sudo npm install -g typescript`
4. Add this to your .bashrc so that Fabric can be found
   `export PATH=/home/vmuser/fabric-samples/bin:$PATH`
5.  Install PIP for python3 and Flask
   `sudo apt-get install python3-pip`
   `pip3 install -U Flask`
