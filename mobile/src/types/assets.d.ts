// Fichiers d'images importés comme ressources Metro (identifiant numérique de ressource).
declare module "*.svg" {
  const asset: number;
  export default asset;
}

declare module "*.png" {
  const asset: number;
  export default asset;
}
