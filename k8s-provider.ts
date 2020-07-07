import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

const config = new pulumi.Config();

const env = config.get('infrastructureStack') || pulumi.getStack();
export const cluster = new pulumi.StackReference(
  `benjick/infrastructure/${env}`,
);
const kubeconfig = cluster.getOutput('kubeconfig');

export const k8sProvider = new k8s.Provider('cluster', {
  kubeconfig: kubeconfig.apply(JSON.stringify),
});
