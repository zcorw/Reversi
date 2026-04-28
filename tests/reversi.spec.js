// @ts-check
import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appUrl = `file://${path.resolve(__dirname, '..', 'index.html')}`;

async function openGame(page) {
  await page.goto(appUrl);
  await expect(page.getByRole('heading', { name: '黑白棋' })).toBeVisible();
}

test('初始化棋盘、比分和合法落点', async ({ page }) => {
  await openGame(page);

  await expect(page).toHaveTitle(/黑白棋 Reversi/);
  await expect(page.locator('#blackScore')).toHaveText('2');
  await expect(page.locator('#whiteScore')).toHaveText('2');
  await expect(page.locator('.cell.legal')).toHaveCount(4);
  await expect(page.locator('#statusText')).toContainText('轮到你执黑棋');
});

test('人人对战模式可以落子并翻转棋子', async ({ page }) => {
  await openGame(page);

  await page.getByLabel('模式').selectOption('human');
  await page.getByRole('gridcell', { name: '3行4列，可落子' }).click();

  await expect(page.locator('#blackScore')).toHaveText('4');
  await expect(page.locator('#whiteScore')).toHaveText('1');
  await expect(page.locator('#statusText')).toContainText('轮到白棋');
  await expect(page.getByRole('gridcell', { name: '3行4列，黑棋' })).toBeVisible();
});

test('人机对战模式中 AI 会在玩家落子后自动行动', async ({ page }) => {
  await openGame(page);

  await page.getByRole('gridcell', { name: '3行4列，可落子' }).click();
  await expect(page.locator('#statusText')).toContainText('AI 正在思考');

  await expect(page.locator('#statusText')).toContainText('轮到你执黑棋', { timeout: 3000 });
  await expect
    .poll(async () => {
      const black = Number(await page.locator('#blackScore').textContent());
      const white = Number(await page.locator('#whiteScore').textContent());
      return black + white;
    })
    .toBe(6);
});

test('点击规则说明按钮会展示规则弹窗', async ({ page }) => {
  await openGame(page);

  let message = '';
  page.once('dialog', async (dialog) => {
    message = dialog.message();
    await dialog.accept();
  });
  await page.getByRole('button', { name: '规则说明' }).click();

  expect(message).toContain('黑白棋规则说明');
  expect(message).toContain('至少有一个方向能夹住对方棋子');
});

test('AI 落子后会展示并保留推理过程文本', async ({ page }) => {
  await openGame(page);

  await expect(page.locator('#aiLog')).toContainText('暂无 AI 推理记录');
  await page.getByRole('gridcell', { name: '3行4列，可落子' }).click();
  await expect(page.locator('#statusText')).toContainText('轮到你执黑棋', { timeout: 3000 });

  await expect(page.locator('#aiLogCount')).toHaveText('1 次');
  await expect(page.locator('#aiLog')).toContainText('第 1 次 AI 推理');
  await expect(page.locator('#aiLog')).toContainText('候选明细');
  await expect(page.locator('#aiLog')).toContainText('最终选择');
});

test('AI 策略优先选择角，并避免给对手边角机会', async ({ page }) => {
  await openGame(page);

  const chosenMove = await page.evaluate(() => {
    const { Board, ReversiAI, constants } = window.ReversiDebug;
    const { EMPTY, BLACK, WHITE, SIZE } = constants;
    const board = new Board();
    board.loadCells(Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY)));

    board.set(0, 1, BLACK);
    board.set(0, 2, WHITE);
    board.set(1, 0, BLACK);
    board.set(1, 1, WHITE);
    board.set(2, 0, WHITE);
    board.set(2, 2, BLACK);
    board.set(3, 3, WHITE);
    board.set(3, 4, BLACK);

    return ReversiAI.chooseMove(board, WHITE);
  });

  expect(chosenMove).toMatchObject({ row: 0, col: 0 });
});

test('位棋盘计算不会在棋盘边界跨行串位', async ({ page }) => {
  await openGame(page);

  const legalMoves = await page.evaluate(() => {
    const { Board, Rules, constants } = window.ReversiDebug;
    const { EMPTY, BLACK, WHITE, SIZE } = constants;
    const board = new Board();
    board.loadCells(Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY)));

    board.set(0, 7, BLACK);
    board.set(1, 0, WHITE);

    return Array.from(Rules.legalMoves(board, BLACK).values()).map(({ row, col }) => ({
      row,
      col,
    }));
  });

  expect(legalMoves).toEqual([]);
});

test('横屏时棋盘和 AI 推理区域水平排列', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 760 });
  await openGame(page);

  const boardBox = await page.locator('#board').boundingBox();
  const logBox = await page.locator('.ai-log').boundingBox();

  expect(boardBox).not.toBeNull();
  expect(logBox).not.toBeNull();
  expect(logBox.x).toBeGreaterThan(boardBox.x + boardBox.width);
});

test('竖屏时棋盘和 AI 推理区域垂直排列', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await openGame(page);

  const boardBox = await page.locator('#board').boundingBox();
  const logBox = await page.locator('.ai-log').boundingBox();

  expect(boardBox).not.toBeNull();
  expect(logBox).not.toBeNull();
  expect(logBox.y).toBeGreaterThan(boardBox.y + boardBox.height);
});
