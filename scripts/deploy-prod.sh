# Install Azure Functions Core Tools
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/debian/$(lsb_release -rs | cut -d'.' -f 1)/prod/ $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4

# Install Azure CLI
sudo apt-get install -y azure-cli

export FUNCTIONS_EXTENSION_VERSION="~4"
resourceGroup=integrotion-weur-prod-integrotion-rg
functionAppName=integrotion-weur-prod-integrotion

az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID
az account set --subscription $AZURE_SUBSCRIPTION_ID

updateAppSettings() {
    xargs az functionapp config appsettings set --name $functionAppName --resource-group $resourceGroup --settings <../.env.production
}

publishFunctionApp() {
    # create node_modules symlink
    ln -s ../node_modules/ node_modules
    ln -s ../dist/ dist

    func azure functionapp publish $functionAppName
    updateAppSettings
}

( cd functionApp && publishFunctionApp )