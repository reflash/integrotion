# Set subscription-id
# use az login to display subscriptions (id field)
az login
az account set -s "<subscription-id>"
az ad sp create-for-rbac --name "integrotion-subscription-principal"

export AZURE_SUBSCRIPTION_ID='<subscription-id>'
export AZURE_TENANT_ID='<tenant_id>'
export AZURE_CLIENT_ID='<appId>'
export AZURE_CLIENT_SECRET='<password>'