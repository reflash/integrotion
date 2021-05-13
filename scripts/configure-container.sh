npm i -g yarn
npm i -g ngrok 
export $(egrep -v '^#' .env | xargs)
ngrok authtoken $NGROK_TOKEN

# Install starhip
cp -R .devcontainer/.config ~/
curl -fsSL https://starship.rs/install.sh | bash -s -- --yes
echo 'eval "$(starship init bash)"' >> ~/.bashrc

curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
