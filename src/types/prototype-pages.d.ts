declare module 'virtual:prototype-pages' {
  export type PrototypePageSource = {
    path: string
    name: string
    content: string
  }

  const pages: PrototypePageSource[]
  export default pages
}
