#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -e

# remove the local state
rm -f ~/.hfc-key-store/*

# Shut down the Docker containers for the system tests.
docker-compose -f docker-compose.yaml kill && docker-compose -f docker-compose.yaml down --volumes

docker rm -f $(docker ps -aq)

# remove chaincode docker images
docker rmi $(docker images peer* -q)

docker volume prune

# Your system is now clean