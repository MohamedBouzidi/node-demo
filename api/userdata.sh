#!/bin/bash

APP_DIR="/usr/src/app"
APP_REPOSITORY="https://github.com/MohamedBouzidi/node-demo"
APP_PORT="8080"

# Retrieve parameters from SSM
yum install -y jq
AWS_REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed -e 's/[a-z]$//g')
get_parameters () {
    PARAMS=$(aws ssm get-parameters-by-path --path ${1} --region us-east-1 --query "Parameters[].{ Name: Name, Value: Value }")
    for param in $(echo $PARAMS | jq -c '.[]'); do
        name=$(echo $param | jq -r '.Name' | rev | cut -d/ -f1 | rev)
        value=$(echo $param | jq -r '.Value')
        echo $name=$value >> envars
    done
    source envars
    unset PARAMS
    rm envars
}

get_parameters "/node-demo/dev/db/"
DATABASE_URL=$endpoint
DATABASE_USER=$username
DATABASE_PASS=$password
DATABASE_NAME=$database

get_parameters "/node-demo/dev/cache/"
REDIS_URL=$endpoint
REDIS_PORT=$port

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
rm -rf ${APP_DIR}/web
cd ${APP_DIR}/api
rm userdata.sh
npm install

# Configure CloudWatch agent
yum install -y amazon-cloudwatch-agent
mv ${APP_DIR}/api/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/
systemctl start amazon-cloudwatch-agent
systemctl enable amazon-cloudwatch-agent

# Start app
cd ${APP_DIR}/api
source /etc/profile.d/env_vars.sh
npm start