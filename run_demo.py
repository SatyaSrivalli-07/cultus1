import sys
import time
import random

class Color:
    RED = 'RED'
    BLACK = 'BLACK'

class Node:
    def __init__(self, key, value, color, left=None, right=None):
        self.key = key
        self.value = value
        self.color = color
        self.left = left
        self.right = right

class PersistentRBTree:
    def __init__(self, root=None):
        self.root = root

    def get(self, key):
        curr = self.root
        while curr:
            if key < curr.key:
                curr = curr.left
            elif curr.key < key:
                curr = curr.right
            else:
                return curr.value
        return None

    def contains(self, key):
        return self.get(key) is not None

    def insert(self, key, value):
        new_root = self._ins(self.root, key, value)
        new_root = self._recolor(new_root, Color.BLACK)
        return PersistentRBTree(new_root)

    def remove(self, key):
        if not self.contains(key):
            return self
        new_root, deficit = self._del(self.root, key)
        if new_root:
            new_root = self._recolor(new_root, Color.BLACK)
        return PersistentRBTree(new_root)

    def keys(self):
        out = []
        self._inorder_keys(self.root, out)
        return out

    def size(self):
        return self._node_count(self.root)

    def black_height(self):
        return self._check_black_height(self.root)

    @staticmethod
    def _make_node(key, value, color, left, right):
        return Node(key, value, color, left, right)

    @staticmethod
    def _recolor(n, color):
        if not n:
            return None
        return Node(n.key, n.value, color, n.left, n.right)

    @staticmethod
    def _is_red(n):
        return n is not None and n.color == Color.RED

    @staticmethod
    def _get_color(n):
        return n.color if n else Color.BLACK

    @classmethod
    def _balance(cls, color, left, key, value, right):
        if color == Color.BLACK:
            if cls._is_red(left) and cls._is_red(left.left):
                return cls._make_node(left.key, left.value, Color.RED,
                                       cls._recolor(left.left, Color.BLACK),
                                       cls._make_node(key, value, Color.BLACK, left.right, right))
            if cls._is_red(left) and cls._is_red(left.right):
                return cls._make_node(left.right.key, left.right.value, Color.RED,
                                       cls._make_node(left.key, left.value, Color.BLACK, left.left, left.right.left),
                                       cls._make_node(key, value, Color.BLACK, left.right.right, right))
            if cls._is_red(right) and cls._is_red(right.left):
                return cls._make_node(right.left.key, right.left.value, Color.RED,
                                       cls._make_node(key, value, Color.BLACK, left, right.left.left),
                                       cls._make_node(right.key, right.value, Color.BLACK, right.left.right, right.right))
            if cls._is_red(right) and cls._is_red(right.right):
                return cls._make_node(right.key, right.value, Color.RED,
                                       cls._make_node(key, value, Color.BLACK, left, right.left),
                                       cls._recolor(right.right, Color.BLACK))
        return cls._make_node(key, value, color, left, right)

    @classmethod
    def _ins(cls, n, key, value):
        if not n:
            return cls._make_node(key, value, Color.RED, None, None)
        if key < n.key:
            return cls._balance(n.color, cls._ins(n.left, key, value), n.key, n.value, n.right)
        if n.key < key:
            return cls._balance(n.color, n.left, n.key, n.value, cls._ins(n.right, key, value))
        return cls._make_node(n.key, value, n.color, n.left, n.right)

    @classmethod
    def _min_node(cls, n):
        while n.left:
            n = n.left
        return n

    @classmethod
    def _fix_deficit_left(cls, n):
        sib = n.right
        if cls._get_color(sib) == Color.RED:
            new_n = cls._make_node(n.key, n.value, Color.RED, n.left, sib.left)
            fixed_n, _ = cls._fix_deficit_left(new_n)
            return cls._make_node(sib.key, sib.value, n.color, fixed_n, sib.right), False

        sib_left_red = cls._is_red(sib.left)
        sib_right_red = cls._is_red(sib.right)

        if not sib_left_red and not sib_right_red:
            new_sib = cls._make_node(sib.key, sib.value, Color.RED, sib.left, sib.right)
            new_color = Color.BLACK if n.color == Color.RED else n.color
            merged = cls._make_node(n.key, n.value, new_color, n.left, new_sib)
            return merged, n.color != Color.RED

        if not sib_right_red:
            sib = cls._make_node(sib.left.key, sib.left.value, Color.BLACK, sib.left.left,
                                  cls._make_node(sib.key, sib.value, Color.RED, sib.left.right, sib.right))

        new_left = cls._make_node(n.key, n.value, Color.BLACK, n.left, sib.left)
        return cls._make_node(sib.key, sib.value, n.color, new_left, cls._recolor(sib.right, Color.BLACK)), False

    @classmethod
    def _fix_deficit_right(cls, n):
        sib = n.left
        if cls._get_color(sib) == Color.RED:
            new_n = cls._make_node(n.key, n.value, Color.RED, sib.right, n.right)
            fixed_n, _ = cls._fix_deficit_right(new_n)
            return cls._make_node(sib.key, sib.value, n.color, sib.left, fixed_n), False

        sib_left_red = cls._is_red(sib.left)
        sib_right_red = cls._is_red(sib.right)

        if not sib_left_red and not sib_right_red:
            new_sib = cls._make_node(sib.key, sib.value, Color.RED, sib.left, sib.right)
            new_color = Color.BLACK if n.color == Color.RED else n.color
            merged = cls._make_node(n.key, n.value, new_color, new_sib, n.right)
            return merged, n.color != Color.RED

        if not sib_left_red:
            sib = cls._make_node(sib.right.key, sib.right.value, Color.BLACK,
                                  cls._make_node(sib.key, sib.value, Color.RED, sib.left, sib.right.left),
                                  sib.right.right)

        new_right = cls._make_node(n.key, n.value, Color.BLACK, sib.right, n.right)
        return cls._make_node(sib.key, sib.value, n.color, cls._recolor(sib.left, Color.BLACK), new_right), False

    @classmethod
    def _del(cls, n, key):
        if not n:
            return None, False
        if key < n.key:
            new_left, deficit = cls._del(n.left, key)
            merged = cls._make_node(n.key, n.value, n.color, new_left, n.right)
            return cls._fix_deficit_left(merged) if deficit else (merged, False)
        if n.key < key:
            new_right, deficit = cls._del(n.right, key)
            merged = cls._make_node(n.key, n.value, n.color, n.left, new_right)
            return cls._fix_deficit_right(merged) if deficit else (merged, False)

        if not n.left and not n.right:
            if n.color == Color.RED:
                return None, False
            return None, True
        if not n.left or not n.right:
            child = n.left or n.right
            return cls._recolor(child, Color::BLACK if hasattr(Color, 'BLACK') else Color.BLACK), False

        succ = cls._min_node(n.right)
        new_right, deficit = cls._del(n.right, succ.key)
        merged = cls._make_node(succ.key, succ.value, n.color, n.left, new_right)
        return cls._fix_deficit_right(merged) if deficit else (merged, False)

    @classmethod
    def _inorder_keys(cls, n, out):
        if not n:
            return
        cls._inorder_keys(n.left, out)
        out.append(n.key)
        cls._inorder_keys(n.right, out)

    @classmethod
    def _node_count(cls, n):
        if not n:
            return 0
        return 1 + cls._node_count(n.left) + cls._node_count(n.right)

    @classmethod
    def _check_black_height(cls, n):
        if not n:
            return 1
        if n.color == Color.RED and (cls._is_red(n.left) or cls._is_red(n.right)):
            raise ValueError(f"Red-red violation at key {n.key}")
        lh = cls._check_black_height(n.left)
        rh = cls._check_black_height(n.right)
        if lh != rh:
            raise ValueError(f"Black-height mismatch at key {n.key}")
        return lh + (1 if n.color == Color.BLACK else 0)


def run_tests():
    print("=== Running Persistent RB-Tree Unit Tests ===")
    
    t = PersistentRBTree()
    t1 = t.insert(10, "ten").insert(5, "five").insert(20, "twenty")
    assert t1.get(10) == "ten"
    assert t1.get(5) == "five"
    assert t1.get(20) == "twenty"
    assert t1.get(999) is None
    print("[PASS] basic insert and get")

    t1 = t.insert(1, "a").insert(1, "b")
    assert t1.get(1) == "b"
    assert t1.size() == 1
    print("[PASS] overwrite key")

    t0 = PersistentRBTree()
    t1 = t0.insert(1, "a").insert(2, "b")
    t2 = t1.insert(3, "c")
    assert t1.keys() == [1, 2]
    assert t2.keys() == [1, 2, 3]
    print("[PASS] insert immutability")

    t1 = t0.insert(1, "a").insert(2, "b").insert(3, "c")
    t2 = t1.remove(2)
    assert t1.keys() == [1, 2, 3]
    assert t2.keys() == [1, 3]
    print("[PASS] delete immutability")

    t = PersistentRBTree()
    for i in range(15):
        t = t.insert(i, f"v{i}")
    before = t
    after = t.insert(1000, "far away")
    assert before.root.left is after.root.left or before.root is after.root.left
    print("[PASS] structural sharing")

    snapshots = []
    t = PersistentRBTree()
    for k in range(200):
        t = t.insert(k, f"v{k}")
        if k % 20 == 0:
            snapshots.append((t, k))
    for k in range(0, 100, 3):
        t = t.remove(k)
    for snap_t, up_to in snapshots:
        assert snap_t.keys() == list(range(up_to + 1))
    print("[PASS] historical snapshot survival")

    t = PersistentRBTree()
    rng = random.Random(42)
    keys = []
    for _ in range(300):
        k = rng.randint(0, 2000)
        t = t.insert(k, k * 2)
        keys.append(k)
    sorted_unique = sorted(list(set(keys)))
    assert t.keys() == sorted_unique
    t.black_height()
    print("[PASS] random inserts invariants")

    print("=== All tests finished successfully! ===")

if __name__ == "__main__":
    run_tests()
