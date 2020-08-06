import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { k8sProvider } from './k8s-provider';

const config = new pulumi.Config('digitalocean');
const apiToken = config.requireSecret('token');

export const externalDnsChart = new k8s.helm.v3.Chart(
  'external-dns',
  {
    chart: 'external-dns',
    version: '3.2.3',
    values: {
      digitalocean: {
        apiToken,
      },
      provider: 'digitalocean',
      txtOwnerId: 'external-dns-pulumi',
      podSecurityContext: {
        fsGroup: 65534,
      },
    },
    fetchOpts: {
      repo: 'https://charts.bitnami.com/bitnami',
    },
  },
  {
    provider: k8sProvider,
  },
);
