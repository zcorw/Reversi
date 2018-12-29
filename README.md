#黑白棋

##模块
* 棋盘类
* 棋子类
* 网格类
* 规则类
* 落子管理类

---
###棋盘类
棋盘类作为中介者模式中的中介者，管理棋盘上所有棋子，处理吃子等棋子交互事件。管理当前棋盘黑、白棋子分布，统计各色棋子数量、控制棋子颜色。

* Board
   * addPiece
   * setColor
   * getData

###棋子类
每次等待玩家下棋时，会有对应的半透明棋子提示玩家目前可落子位置，这些备选棋子的元素实际上是相同的，每次玩家落子后那些未被选中的备选棋子其实可以回收的，以备下次使用。于是棋子类作为对象池使用，那些被回收的棋子放入对象池中等待下一次使用。

* Pieces
   * createPureDom
   * create
   * recover

###网格类
棋盘实际是由一个个网格构成，由网格类实例化出来的对象标示了网格对应的坐标、网格元素，后续可以在网格中加入棋子，然后透过网格对象对棋子的颜色进行管理。

###规则类
规则类是一个状态机，将玩家间换手的规则内化到类中，同时提供方法返回可落子坐标供棋盘类显示。

###落子管理类
该类采用命令模式，每次玩家或AI落子都通过该类开放的方法进行执行，同时记录每次落子的位置以及落子后所有备选坐标，为撤销和重做提供数据。

###空间计算类
方法集，集中关于计算当前棋局的边界，可落子位置，落子后计算可翻转棋子的坐标。

----

该项目难点在于如何去计算落子后给对方可落子的位置，要计算出这些坐标，就要计算每个空闲的位置落子后能否带来翻转。
可翻转的规则其实很简单，就是让落子与己方棋子夹住对手的棋子，然后中间所有的对手棋子就能翻转为己方棋子。夹是以落子为中心，向横、竖、斜八个方向出发，直到遇到己方的棋子结束，中间必须全部是对方棋子，不能有空格。由此我们可以推出以下几个判断点：

* 落子必须是在于棋子相邻的空格
* 落子必须与对方棋子相邻，与空格、己方棋子相邻这个方向就不能继续下去
* 以落子为中心，横、竖、斜八个方向（成米字型）上要有自己的棋子（不必八个方向都有）

-----

一般保存棋子布局都是用一个二维数组，通过0、1、2来表示空格、白子、黑子。这种做法运算要一个个元素拿出来做匹配，效率较低。我采用三个二进制表来表示空格、白子、黑子。如下图（谷歌上找的一张棋谱）：

![棋谱](http://www.soongsky.com/othello/othello.php?rd=f5d6c4d3c3f4c5b3c2)

空格对应二进制表：

```
11111111
11011111
10001111
11000011
11000011
11101111
11111111
11111111
```

黑子对应二进制表：

```
00000000
00100000
00100000
00101000
00110100
00000000
00000000
00000000
```

白子对应二进制表：

```
00000000
00000000
01010000
00010100
00001000
00010000
00000000
00000000
```

通过按位与`&`，按位异或`^`，按位或`|`的操作，能批量对一排棋子一次性进行计算，大大减少运算次数。
比如轮到黑子持有这落子，要检测第2排是否有能够落子的空格，根据上面总结的三条规则，我们可以这样去算（为方便说明，只演示计算向下方向）：

先取空格表的第2排数据与白子表的第3排数据做按位与计算，过滤出与白子相邻的空格

`0b11011111 & 0b01010000 \\计算结果：0b01010000`

然后我们再取第4排黑子数据与上面的结果再做按位与计算，看是否能遇上己方的棋子

`0b00101000 & 0b01010000 \\计算结果：0b00000000`

看来在第四排没有遇上己方棋子，那么我们将第一步的结果保存起来，取第4排白子表数据与刚保存的结果重复前面一、二步计算，当第一步结果为0，证明这一排数据在这个方向已经到头了（不一定是棋盘边界，可能是到了另一边的空格），结束循环；当第二步结果非0时，证明出现了符合落子位置，用按位或并入保存可落子的变量中。

```
//boundary:空格，other:白子，self:黑子
for (let y = 0; y < len - 2; y++) {
	if (boundary[y] === 0) {
        continue;
    }
    let _success = 0; //过滤通过组
    let filterB = boundary[y]; //过滤组
    for (let i = 1; i < len - y - 1; i++) {
        //正下方
        filterB &= other[y + i];
        if (filterB == 0) {
            break;
        }
		 _success |= self[y + i + 1] & filterB;
    }
}
```


