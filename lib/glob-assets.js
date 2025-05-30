import path from "path";
import { isPlainObject, castArray, uniqWith, uniq } from "lodash-es";
import dirGlob from "dir-glob";
import { globby } from "globby";
import _debug from "debug";
const debug = _debug("@wafful-release/gitlab-module");

export default async ({ cwd }, assets) =>
  uniqWith(
    []
      // eslint-disable-next-line unicorn/prefer-spread
      .concat(
        ...(await Promise.all(
          assets.map(async (asset) => {
            // Wrap single glob definition in Array
            let glob = castArray(isPlainObject(asset) ? asset.path : asset);
            // TODO Temporary workaround for https://github.com/mrmlnc/fast-glob/issues/47
            glob = uniq([...(await dirGlob(glob, { cwd })), ...glob]);

            // Skip solo negated pattern (avoid to include every non js file with `!**/*.js`)
            if (glob.length <= 1 && glob[0].startsWith("!")) {
              debug(
                "skipping the negated glob %o as its alone in its group and would retrieve a large amount of files",
                glob[0]
              );
              return [];
            }

            const globbed = await globby(glob, {
              cwd,
              expandDirectories: false, // TODO Temporary workaround for https://github.com/mrmlnc/fast-glob/issues/47
              gitignore: false,
              dot: true,
              onlyFiles: false,
            });

            if (isPlainObject(asset)) {
              if (globbed.length > 1) {
                // If asset is an Object with a glob the `path` property that resolve to multiple files,
                // Output an Object definition for each file matched and set each one with:
                // - `path` of the matched file
                // - `label` based on the actual file name (to avoid assets with duplicate `label`s)
                // - `filepath` ignored (also to avoid duplicates)
                // - other properties of the original asset definition
                const { filepath, ...others } = asset;
                return globbed.map((file) => ({ ...others, path: file, label: path.basename(file) }));
              }

              // If asset is an Object, output an Object definition with:
              // - `path` of the matched file if there is one, or the original `path` definition (will be considered as a missing file)
              // - other properties of the original asset definition
              return { ...asset, path: globbed[0] || asset.path };
            }

            if (globbed.length > 0) {
              // If asset is a String definition, output each files matched
              return globbed;
            }

            // If asset is a String definition but no match is found, output the elements of the original glob (each one will be considered as a missing file)
            return glob;
          })
          // Sort with Object first, to prioritize Object definition over Strings in dedup
        ))
      )
      .sort((asset) => (isPlainObject(asset) ? -1 : 1)),
    // Compare `path` property if Object definition, value itself if String
    (a, b) => path.resolve(cwd, isPlainObject(a) ? a.path : a) === path.resolve(cwd, isPlainObject(b) ? b.path : b)
  );
