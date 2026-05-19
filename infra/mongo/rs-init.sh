#!/bin/bash
# MongoDB Replica Set Initialization Script
# Run this after docker-compose up:
#   docker exec ptm-mongodb bash /scripts/rs-init.sh

echo "Waiting for MongoDB to start..."
sleep 5

mongosh --eval '
  rs.initiate({
    _id: "rs0",
    members: [
      { _id: 0, host: "mongodb:27017" }
    ]
  })
'

echo "Replica set initialized!"
echo "Waiting for replica set to be ready..."
sleep 3

mongosh --eval 'rs.status()'
echo "Done!"
