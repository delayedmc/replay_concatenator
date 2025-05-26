# Replay Concatenator

Unir replays separados do Replay Mod para que timelapses gravadas em momentos distintos se comportem como um único replay contínuo.

## Configuração

Node modules:
- archiver ^7.0.1
- extract-zip ^2.0.1",
- rimraf ^5.0.5"

### Instalação

Com o Git instalado, abra o cmd e clone este repositório:

https://github.com/delayedmc/replay_concatenator.git


Com o Node.js instalado:

cd sua-pasta-clonada

npm install


*Existe uma função opcional de compactação (ZIP), mais rápida e baseada em Python. Caso deseje utilizá-la, instale o Python e a biblioteca "shutil".

## Como usar

1. Crie as pastas: run, temp, input, output na pasta onde o clone foi realizado.

2. Configure os campos base_name, run_dir e output_render_dir em settings. Se quiser usar a compactação zip defina "use_python_zip" para "true".

3. Verifique as configurações em output_settings.

4. No Replay Mod, crie o movimento da câmera com um keyframe de tempo no início e outro no fim, sincronizados com os keyframes da câmera.

5. Salve a câmera no Keyframe Repository e clique em Copy.

6. Cole o texto copiado do botão Copy do Replay Mod no arquivo "camera_data.json".

7. Copie os replays da timelapse e cole na pasta input.

8. Renomeie e numere os replays na ordem em que deseja que apareçam na renderização final.

9. Abra o cmd e execute: "node replay_concat.js". Os replays corrigidos serão exportados para a pasta "output".

10. Pegue os replays exportados da pasta output e coloque-os na pasta replay_recordings dentro da sua .minecraft.".

11. No jogo, selecione os replays que deseja renderizar e clique em 'Renderizar todos'.
