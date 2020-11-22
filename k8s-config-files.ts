import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as _dedent from 'dedent';

const type = 'benjick:kubernetes:ConfigFiles';

type Contents = pulumi.Output<string> | string;

interface ConfigFilesArgs {
  /**
   * A record of files to create. Contents will be dedented.
   *
   * Example:
   * ```
   * {
   *   '/usr/local/etc/php/conf.d/my-config.ini': `
   *     pm = static
   *     pm.max_children = 20
   *   `
   * }
   * ```
   */
  files: Record<string, Contents>;
  /**
   * Standard object's metadata. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata
   */
  metadata?: pulumi.Input<k8s.types.input.meta.v1.ObjectMeta>;
}

interface File {
  path: string;
  name: string;
  contents: Contents;
}

export class ConfigFiles extends pulumi.ComponentResource {
  readonly configMap: k8s.core.v1.ConfigMap;
  readonly volumeMounts: k8s.types.input.core.v1.VolumeMount[];
  readonly volume: k8s.types.input.core.v1.Volume;
  readonly name: string;

  /**
   * Create a config map and the corresponding volume and volume mounts.
   *
   * Example usage:
   * ```
   * const files = new ConfigFiles('test', {
   *   metadata,
   *   files: {
   *     '/usr/local/etc/php-fpm.d/www.conf': `
   *       pm = static
   *       pm.max_children = 20
   *     `,
   *   },
   * });
   *
   * export const deployment = new k8s.apps.v1.Deployment(appName, {
   *   metadata,
   *   spec: {
   *     template: {
   *       spec: {
   *         containers: [
   *           {
   *             // Other settings
   *             volumeMounts: [...files.volumeMounts],
   *           },
   *         ],
   *         volumes: [files.volume],
   *       },
   *     },
   *   },
   * });
   * ```
   *
   * @param name The unique name of the resource. Will be used for Volume name as well.
   * @param args The arguments to use to populate this resource's properties.
   * @param opts A bag of options that control this resource's behavior.
   */
  constructor(
    name: string,
    args: ConfigFilesArgs,
    opts?: pulumi.ResourceOptions,
  ) {
    super(type, name, {}, opts);
    const files = ConfigFiles.filesToArray(args.files);
    this.configMap = new k8s.core.v1.ConfigMap(
      `${name}-config`,
      {
        metadata: args.metadata,
        data: ConfigFiles.arrayToConfigData(files),
      },
      {
        ...opts,
        parent: this,
      },
    );

    const volumeName = pulumi.interpolate`${this.configMap.metadata.name}-mount`;

    this.volumeMounts = files.map(({ path, name }) => ({
      name: volumeName,
      mountPath: path,
      subPath: name,
      readOnly: true,
    }));

    this.volume = {
      name: volumeName,
      configMap: {
        name: this.configMap.metadata.name,
      },
    };
  }

  /**
   * Run dedent on Output<string> | string
   * 
   * @param contents file contents
   */
  static dedent(contents: Contents): Contents {
    return typeof contents === 'string'
      ? _dedent(contents)
      : contents.apply(_dedent);
  }

  static getFilename(path: string) {
    return path.split('/').pop();
  }

  static filesToArray(files: Record<string, Contents>): File[] {
    return Object.entries(files).map(([path, contents]) => ({
      path,
      name: this.getFilename(path),
      contents: this.dedent(contents),
    }));
  }

  static arrayToConfigData(array: File[]): Record<string, Contents> {
    const data = {};
    array.forEach((item) => {
      data[item.name] = item.contents;
    });
    return data;
  }
}
