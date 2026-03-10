import type { ComponentType } from "react";

import Alert from "./components/Alert";
import AlgorithmStepper from "./components/AlgorithmStepper";
import AlgorithmVisualizer from "./components/AlgorithmVisualizer";
import Badge from "./components/Badge";
import BarChart from "./components/BarChart";
import Button from "./components/Button";
import Card from "./components/Card";
import Checkbox from "./components/Checkbox";
import CodeDisplay from "./components/CodeDisplay";
import Diagram from "./components/Diagram";
import Grid from "./components/Grid";
import LineChart from "./components/LineChart";
import MetricCard from "./components/MetricCard";
import PieChart from "./components/PieChart";
import Progress from "./components/Progress";
import QuoteCard from "./components/QuoteCard";
import Select from "./components/Select";
import Stack from "./components/Stack";
import Table from "./components/Table";
import Tabs from "./components/Tabs";
import Text from "./components/Text";
import TextInput from "./components/TextInput";

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
