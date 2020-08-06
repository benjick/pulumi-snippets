import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as aws from '@pulumi/aws';
import { k8sProvider } from './k8s-provider';

const config = new pulumi.Config();
const baseDomain = config.require('baseDomain');
const apiToken = config.requireSecret('cfToken');
const email = config.requireSecret('email');

export const externalDnsChart = new k8s.helm.v2.Chart(
  'external-dns',
  {
    chart: 'external-dns',
    version: '3.2.3',
    namespace: servicesNamespace.metadata.name,
    values: {
      provider: 'cloudflare',
      cloudflare: {
        apiToken,
        email,
        proxied: true, // enable the Cloudflare proxy feature
      },
      txtOwnerId: 'safira-external-dns-pulumi',
      domainFilters: [baseDomain],
      podSecurityContext: {
        fsGroup: 65534,
      },
    },
    fetchOpts: {
      repo: 'https://charts.bitnami.com/bitnami',
    },
  },
  {
    provider: cluster.provider,
  },
);
