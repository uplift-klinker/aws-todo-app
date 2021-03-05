#!/bin/bash

set -ex

export INFRASTRUCTURE_DIRECTORY="./packages/infra"

function install() {
  yarn install
}

function run_tests() {
  yarn build
  yarn test
}

function deploy() {
  pushd "${INFRASTRUCTURE_DIRECTORY}" || exit 1
  yarn cdk synth
  yarn cdk deploy
  popd || exit 1
}

function main() {
  install
  run_tests
  deploy
}

main
