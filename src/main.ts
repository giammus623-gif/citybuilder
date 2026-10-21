import './ui/styles.css';
import { Game } from './app/game';

declare global {
  interface Window {
    cityLab?: ReturnType<Game['testHook']>;
  }
}

const root = document.getElementById('app');
if (!root) throw new Error('Manca #app');
const game = new Game(root);
if (new URLSearchParams(location.search).has('test')) window.cityLab = game.testHook();
