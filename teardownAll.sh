#!/bin/bash

source contractConfig.sh

# Bring network down
cd first-network
./byfn.sh down

# Clean up docker images
docker rm -f $(docker ps -aq)
docker rmi -f $(docker images | grep $CONTRACT_NAME | awk '{print $3}')
cd ..

# Clean up wallet
rm -rf ${CONTRACT_NAME}/wallet/*

# Clean up ts leftovers
rm -rf ${CONTRACT_NAME}/typescript/{dist,node_modules,package-lock.json}
rm -rf chaincode/${CONTRACT_NAME}/typescript/{dist,node_modules,package-lock.json}
