<template>
  <div
    data-testid="vue-accordion"
    class="accordion"
  >
    <div
      v-for="(item, index) in items"
      :key="index"
      class="accordion-item"
    >
      <button
        class="accordion-header"
        :aria-expanded="isOpen(index)"
        @click="toggleItem(index)"
      >
        {{ item.title }}
        <span class="accordion-icon">
          {{ isOpen(index) ? '-' : '+' }}
        </span>
      </button>
      <div
        v-if="isOpen(index)"
        class="accordion-content"
      >
        {{ item.content }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'AccordionComponent',
  props: {
    items: {
      type: Array,
      default: () => []
    },
    allowMultiple: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const openIndexes = ref([]);

    const toggleItem = (index) => {
      if (props.allowMultiple) {
        const idx = openIndexes.value.indexOf(index);

        if (idx > -1) {
          openIndexes.value.splice(idx, 1);
        } else {
          openIndexes.value.push(index);
        }
      } else {
        openIndexes.value = openIndexes.value.includes(index) ? [] : [index];
      }
    };

    const isOpen = (index) => {
      return openIndexes.value.includes(index);
    };

    return {
      openIndexes,
      toggleItem,
      isOpen
    };
  }
};
</script>

<style scoped>
.accordion {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}
.accordion-item {
  border-bottom: 1px solid #e0e0e0;
}
.accordion-item:last-child {
  border-bottom: none;
}
.accordion-header {
  width: 100%;
  padding: 1rem;
  background: #f5f5f5;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1rem;
  font-weight: 500;
  transition: background 0.2s;
}
.accordion-header:hover {
  background: #ebebeb;
}
.accordion-icon {
  font-size: 1.25rem;
  font-weight: bold;
}
.accordion-content {
  padding: 1rem;
  background: white;
}
</style>

