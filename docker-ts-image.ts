import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';

const config = new pulumi.Config();
// pulumi config set --secret dockerPassword PASSWORD_HERE
const password = config.requireSecret('dockerPassword');

export const image = new docker.Image('myImage', {
  build: '../',
  imageName: 'dumfan/apk',
  registry: {
    username: 'benjick',
    password,
    server: 'docker.io'
  }
})
