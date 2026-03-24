import type { ComponentType } from "react";

import Alert from "./components/content/Alert";
import AlgorithmStepper from "./components/visualization/AlgorithmStepper";
import AlgorithmVisualizer from "./components/visualization/AlgorithmVisualizer";
import Badge from "./components/content/Badge";
import BarChart from "./components/charts/BarChart";
import Button from "./components/forms/Button";
import Card from "./components/layout/Card";
import Checkbox from "./components/forms/Checkbox";
import CodeDisplay from "./components/content/CodeDisplay";
import Diagram from "./components/visualization/Diagram";
import Grid from "./components/layout/Grid";
import LineChart from "./components/charts/LineChart";
import MetricCard from "./components/content/MetricCard";
import PieChart from "./components/charts/PieChart";
import Progress from "./components/content/Progress";
import QuoteCard from "./components/content/QuoteCard";
import Select from "./components/forms/Select";
import Stack from "./components/layout/Stack";
import Table from "./components/content/Table";
import Tabs from "./components/forms/Tabs";
import Text from "./components/content/Text";
import TextInput from "./components/forms/TextInput";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry: Record<string, ComponentType<any>> = {
  Alert,
  AlgorithmStepper,
  AlgorithmVisualizer,
  Badge,
  BarChart,
  Button,
  Card,
  Checkbox,
  CodeDisplay,
  Diagram,
  Grid,
  LineChart,
  MetricCard,
  PieChart,
  Progress,
  QuoteCard,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
};

export default registry;
