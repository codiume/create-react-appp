import path from 'node:path';
import minimist from 'minimist';
import colors from 'picocolors';
import prompts from 'prompts';

const { blue, cyan, red, reset, green, yellow } = colors;

const argv = minimist<{
  template?: string;
  help?: boolean;
}>(process.argv.slice(2), {
  default: { help: false },
  alias: { h: 'help', t: 'template' },
  string: ['_']
});

// prettier-ignore
const helpMessage = `\
Usage: create-react-appp [OPTION]... [DIRECTORY]

Create a new React project in JavaScript or TypeScript.
With no arguments, start the CLI in interactive mode.

Options:
  -t, --template NAME        use a specific template

Available templates:
${cyan('react-ts       react')}
${cyan('react-swc-ts   react-swc')}`;

type ColorFunc = (str: string | number) => string;
type Framework = {
  name: string;
  display: string;
  color: ColorFunc;
  variants: FrameworkVariant[];
};
type FrameworkVariant = {
  name: string;
  display: string;
  color: ColorFunc;
  customCommand?: string;
};
type PkgInfo = {
  name: string;
  version: string;
};

const VARIANTS: FrameworkVariant[] = [
  {
    name: 'react-ts',
    display: 'TypeScript',
    color: blue
  },
  {
    name: 'react-swc-ts',
    display: 'TypeScript + SWC',
    color: blue
  },
  {
    name: 'react',
    display: 'JavaScript',
    color: yellow
  },
  {
    name: 'react-swc',
    display: 'JavaScript + SWC',
    color: yellow
  }
];

const TEMPLATES: string[] = VARIANTS.reduce(
  (a, b) => a.concat(b.name),
  [] as string[]
);

const defaultTargetDir = 'react-project';

async function init() {
  const argTargetDir = formatTargetDir(argv._[0]);
  const argTemplate = argv.template || argv.t;

  const help = argv.help;
  if (help) {
    console.log(helpMessage);
    return;
  }

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);

  let targetDir = argTargetDir || defaultTargetDir;
  let result: prompts.Answers<'projectName' | 'variant'>;

  prompts.override({
    overwrite: argv.overwrite
  });

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : 'text',
          name: 'projectName',
          message: reset('Project name:'),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir;
          }
        },
        {
          type:
            argTemplate && TEMPLATES.includes(argTemplate) ? null : 'select',
          name: 'variant',
          message:
            typeof argTemplate === 'string' && !TEMPLATES.includes(argTemplate)
              ? reset(
                  `"${argTemplate}" isn't a valid template. Please choose from below: `
                )
              : reset('Select a variant:'),
          initial: 0,
          choices: VARIANTS.map((variant) => {
            const variantColor = variant.color;
            return {
              title: variantColor(variant.display || variant.name),
              value: variant
            };
          })
        }
      ],
      {
        onCancel: () => {
          throw new Error(`${red('✖')} Operation cancelled`);
        }
      }
    );
  } catch (cancelled: any) {
    console.log(cancelled.message);
    return;
  }

  // determine template
  const template: string = result.variant.name || argTemplate || 'react';

  const pkgManager = pkgInfo ? pkgInfo.name : 'npm';
  const projectName = path.basename(path.resolve(targetDir));

  console.log('\nDone. Now run:\n');
  console.log(
    green(`${pkgManager} create vite ${projectName} --template ${template}`)
  );
}

function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, '');
}

function pkgFromUserAgent(userAgent: string | undefined): PkgInfo | undefined {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec?.split('/');
  if (!pkgSpecArr) return undefined;

  return {
    name: pkgSpecArr[0] ?? '',
    version: pkgSpecArr[1] ?? ''
  };
}

init().catch((e) => {
  console.error(e);
});
