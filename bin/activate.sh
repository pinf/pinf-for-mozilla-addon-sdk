#!/bin/bash

# TODO: Relocate into helper module.
# @credit http://stackoverflow.com/a/246128/330439
SOURCE="${BASH_SOURCE[0]:-$0}"
while [ -h "$SOURCE" ]; do
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
BASE_PATH="$( cd -P "$( dirname "$SOURCE" )" && pwd )"



# TODO: Relocate this into dedicated service.
echo "[pio] Switching environment ..."
# TODO: Make all this configurable


ulimit -Sn 8192


if hash node 2>/dev/null; then
	echo "" > /dev/null
else
	# @see https://github.com/creationix/nvm
	. "$HOME/.profile"
	if hash nvm 2>/dev/null; then
		echo "nvm: $(which nvm) ($(nvm --version))"
	else
		# TODO: Ask user before installing nvm.
		echo "Installing nvm ..."
		curl https://raw.githubusercontent.com/creationix/nvm/v0.6.1/install.sh | sh
	fi
	. "$HOME/.profile"
	nvm use 0.10
fi
echo "node: $(which node) ($(node -v))"
echo "npm: $(which npm) ($(npm -v))"



# @see http://www.cyberciti.biz/tips/howto-linux-unix-bash-shell-setup-prompt.html
# @see http://www.tldp.org/HOWTO/Bash-Prompt-HOWTO/x329.html
PS1="\[\033[1;34m\]\[\033[47m\](PINF)\[\033[0m\] \[\033[1;35m\]$(basename $(dirname $BASE_PATH))\[\033[0m\] \[\033[33m\]\u\[\033[1;33m\]$\[\033[0m\] "



if [ ! -d "node_modules" ]; then
	npm install
fi


if [ -z ${JETPACK_ROOT+x} ]; then
	if [ ! -d "$BASE_PATH/../.addon-sdk" ]; then
		git clone -b devtools git@github.com:mozilla/addon-sdk.git "$BASE_PATH/../.addon-sdk"
	fi
	_OLD_PATH=$(pwd)
	cd "$BASE_PATH/../.addon-sdk"
	source bin/activate
	cd "$_OLD_PATH"
	export JETPACK_ROOT="$BASE_PATH/../.addon-sdk"
fi
echo "Using JETPACK_ROOT: $JETPACK_ROOT"


export PATH="$BASE_PATH:$BASE_PATH/../node_modules/.bin:$PATH"
