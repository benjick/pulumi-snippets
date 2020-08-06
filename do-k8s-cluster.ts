import * as digitalocean from '@pulumi/digitalocean';
import * as k8s from '@pulumi/kubernetes';

export const cluster = new digitalocean.KubernetesCluster('cluster', {
  region: digitalocean.Regions.LON1,
  version: '1.18.3-do.0',
  nodePool: {
    name: 'default',
    size: digitalocean.DropletSlugs.DropletS1VCPU2GB,
    nodeCount: 3,
  },
});

export const kubeconfig = cluster.kubeConfigs[0].rawConfig;

export const provider = new k8s.Provider('k8s-provider', { kubeconfig });
