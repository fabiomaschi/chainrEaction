#!/bin/bash

source contractConfig.sh

cd $CONTRACT_NAME
export FLASK_APP=client.py
flask run