#!/bin/bash

APP_DIR="/usr/src/app"
APP_REPOSITORY="https://github.com/MohamedBouzidi/node-demo"
DATABASE_URL="localhost"
DATABASE_USER="admindemo"
DATABASE_PASS="admindemo"
DATABASE_NAME="demodb"
REDIS_URL="localhost"
REDIS_PORT="6379"
APP_PORT="8080"

# Save environment variables
cat <<EOF > /etc/profile.d/env_vars.sh
export DATABASE_URL=${DATABASE_URL}
export DATABASE_USER=${DATABASE_USER}
export DATABASE_PASS=${DATABASE_PASS}
export DATABASE_NAME=${DATABASE_NAME}
export REDIS_URL=${REDIS_URL}
export REDIS_PORT=${REDIS_PORT}
export APP_PORT=${APP_PORT}
EOF

# Start SSM agent
systemctl start amazon-ssm-agent
systemctl enable amazon-ssm-agent

# Install Node
curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

# Install app
yum install -y git
mkdir -p ${APP_DIR}
git clone ${APP_REPOSITORY} ${APP_DIR}
cd ${APP_DIR}
rm userdata.sh
npm install

# Configure CloudWatch agent
yum install -y amazon-cloudwatch-agent
mv ${APP_DIR}/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/
systemctl start amazon-cloudwatch-agent
systemctl enable amazon-cloudwatch-agent

# Start app
cd ${APP_DIR}
source /etc/profile.d/env_vars.sh
npm start