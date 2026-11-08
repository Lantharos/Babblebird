export class Git {
  constructor(readonly dir: string) {}

  run(args: string[], input?: string) {
    const result = Bun.spawnSync(["git", "-C", this.dir, ...args], {
      stdin: input === undefined ? undefined : Buffer.from(input),
    })
    if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`)
    return result.stdout
  }

  text(args: string[], input?: string) {
    return this.run(args, input).toString()
  }

  tree(sha: string) {
    return this.text(["ls-tree", "-r", "-l", sha])
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [meta, path] = line.split("\t") as [string, string]
        const [mode, type, object, size] = meta.split(/\s+/) as [string, string, string, string]
        return { path, mode, type, sha: object, size: Number(size) || 0 }
      })
  }

  blobs(shas: string[]) {
    const output = this.run(["cat-file", "--batch"], `${shas.join("\n")}\n`)
    const found = new Map<string, Buffer>()
    let offset = 0
    while (offset < output.length) {
      const end = output.indexOf(10, offset)
      const [sha, , size] = output.subarray(offset, end).toString().split(" ") as [string, string, string]
      const start = end + 1
      found.set(sha, output.subarray(start, start + Number(size)))
      offset = start + Number(size) + 1
    }
    return found
  }

  resolve(ref: string) {
    return this.text(["rev-parse", ref]).trim()
  }
}
