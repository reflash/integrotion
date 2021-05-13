npm i -g yarn
export $(egrep -v '^#' .env | xargs)

# Install starhip
cp -R .devcontainer/.config ~/
curl -fsSL https://starship.rs/install.sh | bash -s -- --yes
echo 'eval "$(starship init bash)"' >> ~/.bashrc

curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
