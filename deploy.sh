#!/usr/bin/env bash

nvm use

pnpm build

cd blog/.vuepress/dist

git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:Forsworns/Forsworns.github.io.git master

cd -
